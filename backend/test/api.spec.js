// Integration test: ทดสอบ API กับฐานข้อมูลจริง (ต้องมี MySQL ที่โหลด schema.sql แล้ว)
// รัน: docker compose up -d db  แล้ว  npm test   (ถ้าเชื่อมต่อฐานข้อมูลไม่ได้ เทสต์ชุดนี้จะถูกข้าม)
// เทสต์สร้างข้อมูลของตัวเอง (อีเมล @test.local) และลบทิ้งเมื่อจบ
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcrypt'
import app from '../app.js'
import db from '../db/knex.js'

let dbReady = true
try {
  await db.raw('select 1')
} catch {
  dbReady = false
  console.warn('⚠ เชื่อมต่อฐานข้อมูลไม่ได้ — ข้าม integration test')
}

const PASS = 'Test@12345'
const tag = Date.now()
const users = {}
const tokens = {}
let period
let topics
let indicators

const api = (method, url, who) => {
  const r = request(app)[method](url)
  return who ? r.set('Authorization', `Bearer ${tokens[who]}`) : r
}

describe.skipIf(!dbReady)('API integration', () => {
  beforeAll(async () => {
    const hash = await bcrypt.hash(PASS, 10)
    for (const [key, role] of [['admin', 'admin'], ['eval', 'evaluator'], ['eval2', 'evaluator'], ['teacher', 'evaluatee'], ['teacher2', 'evaluatee']]) {
      const [id] = await db('users').insert({ email: `${key}.${tag}@test.local`, password_hash: hash, name_th: `ทดสอบ ${key}`, role })
      users[key] = id
      const r = await request(app).post('/api/auth/login').send({ email: `${key}.${tag}@test.local`, password: PASS })
      tokens[key] = r.body.accessToken
    }
    const [pid] = await db('evaluation_periods').insert({
      code: `T${tag}`, name_th: 'รอบทดสอบอัตโนมัติ', buddhist_year: 2569, start_date: '2026-01-01', end_date: '2026-12-31', is_active: 1,
    })
    period = await db('evaluation_periods').where({ id: pid }).first()
  })

  afterAll(async () => {
    if (!period) return
    const ids = Object.values(users)
    const files = await db('attachments').whereIn('evaluatee_id', ids).select('storage_path')
    const fs = await import('fs')
    const path = await import('path')
    for (const f of files) fs.rmSync(path.join(process.cwd(), 'uploads', f.storage_path), { force: true })
    for (const id of ids) fs.rmSync(path.join(process.cwd(), 'uploads', String(id)), { recursive: true, force: true })
    await db('evaluation_periods').where({ id: period.id }).del() // CASCADE ลบข้อมูลในรอบ
    await db('users').whereIn('id', ids).del()
    await db.destroy()
  })

  // ---------------- Auth ----------------
  it('login สำเร็จได้ token และข้อมูลผู้ใช้ (ไม่มี password_hash)', async () => {
    const r = await api('post', '/api/auth/login').send({ email: `teacher.${tag}@test.local`, password: PASS })
    expect(r.status).toBe(200)
    expect(r.body.accessToken).toBeTruthy()
    expect(r.body.user).toMatchObject({ role: 'evaluatee', name: 'ทดสอบ teacher' })
    expect(r.body.user.password_hash).toBeUndefined()
  })

  it('login รหัสผิดตอบ 401', async () => {
    const r = await api('post', '/api/auth/login').send({ email: `teacher.${tag}@test.local`, password: 'wrong' })
    expect(r.status).toBe(401)
  })

  it('บัญชีที่ถูกปิดใช้งานเข้าสู่ระบบไม่ได้', async () => {
    await db('users').where({ id: users.teacher2 }).update({ status: 'disabled' })
    const r = await api('post', '/api/auth/login').send({ email: `teacher2.${tag}@test.local`, password: PASS })
    expect(r.status).toBe(403)
    await db('users').where({ id: users.teacher2 }).update({ status: 'active' })
  })

  it('เปลี่ยนรหัสผ่านตัวเอง', async () => {
    let r = await api('put', '/api/auth/password', 'teacher2').send({ current_password: 'wrong', new_password: 'Another@123' })
    expect(r.status).toBe(422)
    r = await api('put', '/api/auth/password', 'teacher2').send({ current_password: PASS, new_password: 'Another@123' })
    expect(r.status).toBe(200)
    r = await api('post', '/api/auth/login').send({ email: `teacher2.${tag}@test.local`, password: 'Another@123' })
    expect(r.status).toBe(200)
  })

  // ---------------- Users (admin) ----------------
  it('admin จัดการผู้ใช้ได้ / บทบาทอื่นได้ 403', async () => {
    expect((await api('get', '/api/users', 'teacher')).status).toBe(403)
    expect((await api('get', '/api/users', 'eval')).status).toBe(403)

    let r = await api('post', '/api/users', 'admin').send({ email: `new.${tag}@test.local`, password: 'Short', name_th: 'ใหม่', role: 'evaluatee' })
    expect(r.status).toBe(422) // รหัสสั้นเกิน
    r = await api('post', '/api/users', 'admin').send({ email: `new.${tag}@test.local`, password: PASS, name_th: 'ผู้ใช้ใหม่', role: 'evaluatee' })
    expect(r.status).toBe(201)
    const id = r.body.data.id
    users.extra = id

    r = await api('post', '/api/users', 'admin').send({ email: `new.${tag}@test.local`, password: PASS, name_th: 'ซ้ำ', role: 'evaluatee' })
    expect(r.status).toBe(409)

    r = await api('get', `/api/users?search=new.${tag}`, 'admin')
    expect(r.body.total).toBe(1)

    r = await api('put', `/api/users/${id}`, 'admin').send({ name_th: 'แก้ไขแล้ว', status: 'disabled' })
    expect(r.body.data).toMatchObject({ name_th: 'แก้ไขแล้ว', status: 'disabled' })

    r = await api('put', `/api/users/${users.admin}`, 'admin').send({ status: 'disabled' })
    expect(r.status).toBe(422) // ปิดบัญชีตัวเองไม่ได้

    r = await api('delete', `/api/users/${id}`, 'admin')
    expect(r.status).toBe(200)
    delete users.extra
  })

  // ---------------- Master data ----------------
  it('ดึงด้าน/ตัวชี้วัดพร้อมชนิดหลักฐาน', async () => {
    const r = await api('get', '/api/topics', 'teacher')
    expect(r.status).toBe(200)
    topics = r.body.data
    indicators = topics.flatMap((t) => t.indicators)
    expect(indicators.length).toBeGreaterThan(0)
    expect(indicators[0].evidence_types.length).toBeGreaterThan(0)
  })

  // ---------------- Assignments ----------------
  it('admin จับคู่กรรมการ (กันซ้ำ, ตรวจบทบาท)', async () => {
    let r = await api('post', '/api/assignments', 'admin').send({ period_id: period.id, evaluator_id: users.eval, evaluatee_ids: [users.teacher, users.teacher2] })
    expect(r.status).toBe(201)
    expect(r.body.added).toBe(2)
    r = await api('post', '/api/assignments', 'admin').send({ period_id: period.id, evaluator_id: users.eval, evaluatee_ids: [users.teacher] })
    expect(r.body.added).toBe(0)
    r = await api('post', '/api/assignments', 'admin').send({ period_id: period.id, evaluator_id: users.teacher, evaluatee_ids: [users.teacher2] })
    expect(r.status).toBe(422) // ครูเป็นกรรมการไม่ได้

    r = await api('get', `/api/assignments/mine?period_id=${period.id}`, 'eval')
    expect(r.body.data.map((x) => x.evaluatee_id).sort()).toEqual([users.teacher, users.teacher2].sort())
    r = await api('get', `/api/assignments/mine?period_id=${period.id}`, 'eval2')
    expect(r.body.data).toEqual([])
  })

  // ---------------- Attachments ----------------
  let fileId
  it('ครูอัปโหลดหลักฐาน (ชื่อไฟล์ไทย) และตรวจชนิดหลักฐาน/ชนิดไฟล์', async () => {
    const ind = indicators[0]
    let r = await api('post', '/api/attachments', 'teacher')
      .field('period_id', period.id).field('indicator_id', ind.id).field('evidence_type_id', ind.evidence_types[0].id).field('note', 'หมายเหตุทดสอบ')
      .attach('file', Buffer.from('%PDF-1.4 test'), { filename: 'แผนการสอน.pdf', contentType: 'application/pdf' })
    expect(r.status).toBe(201)
    expect(r.body.data.file_name).toBe('แผนการสอน.pdf')
    expect(r.body.data.note).toBe('หมายเหตุทดสอบ')
    fileId = r.body.data.id

    const wrongType = indicators.find((i) => !i.evidence_types.some((e) => e.id === ind.evidence_types[0].id))
    r = await api('post', '/api/attachments', 'teacher')
      .field('period_id', period.id).field('indicator_id', wrongType.id).field('evidence_type_id', ind.evidence_types[0].id)
      .attach('file', Buffer.from('%PDF'), { filename: 'x.pdf', contentType: 'application/pdf' })
    expect(r.status).toBe(409)

    r = await api('post', '/api/attachments', 'teacher')
      .field('period_id', period.id).field('indicator_id', ind.id).field('evidence_type_id', ind.evidence_types[0].id)
      .attach('file', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/x-msdownload' })
    expect(r.status).toBe(400)

    r = await api('post', '/api/attachments', 'eval')
      .field('period_id', period.id).field('indicator_id', ind.id).field('evidence_type_id', ind.evidence_types[0].id)
      .attach('file', Buffer.from('%PDF'), { filename: 'x.pdf', contentType: 'application/pdf' })
    expect(r.status).toBe(403) // กรรมการอัปโหลดแทนครูไม่ได้
  })

  it('สิทธิ์ดู/ดาวน์โหลดไฟล์: เจ้าของ, กรรมการที่จับคู่, admin ได้ — คนอื่นไม่ได้', async () => {
    for (const who of ['teacher', 'eval', 'admin']) {
      const r = await api('get', `/api/attachments/${fileId}/file`, who)
      expect(r.status, who).toBe(200)
      expect(r.headers['content-disposition']).toContain(encodeURIComponent('แผนการสอน.pdf'))
    }
    for (const who of ['eval2', 'teacher2']) {
      const r = await api('get', `/api/attachments/${fileId}/file`, who)
      expect(r.status, who).toBe(403)
    }
    let r = await api('get', `/api/attachments?period_id=${period.id}&evaluatee_id=${users.teacher}`, 'eval2')
    expect(r.status).toBe(403)
    r = await api('get', `/api/attachments?period_id=${period.id}`, 'teacher2')
    expect(r.body.data).toEqual([]) // ครูอีกคนเห็นเฉพาะของตัวเอง
  })

  it('ลบไฟล์ได้เฉพาะเจ้าของ', async () => {
    expect((await api('delete', `/api/attachments/${fileId}`, 'teacher2')).status).toBe(403)
  })

  // ---------------- Self assessment ----------------
  const fullItems = () => indicators.map((i) => (i.type === 'score_1_4' ? { indicator_id: i.id, score: 4 } : { indicator_id: i.id, value_yes_no: 1 }))

  it('ประเมินตนเอง: ร่าง → ส่ง (ต้องครบ) → ล็อก → admin เปิดให้แก้', async () => {
    let r = await api('put', '/api/self-assessments', 'teacher').send({ period_id: period.id, items: fullItems().slice(0, 2) })
    expect(r.body.status).toBe('draft')
    r = await api('put', '/api/self-assessments', 'teacher').send({ period_id: period.id, items: fullItems().slice(0, 2), submit: true })
    expect(r.status).toBe(422)
    r = await api('put', '/api/self-assessments', 'teacher').send({ period_id: period.id, items: fullItems(), submit: true })
    expect(r.body.status).toBe('submitted')
    r = await api('put', '/api/self-assessments', 'teacher').send({ period_id: period.id, items: fullItems() })
    expect(r.status).toBe(409)
    r = await api('post', '/api/self-assessments/reopen', 'admin').send({ period_id: period.id, evaluatee_id: users.teacher })
    expect(r.status).toBe(200)
    r = await api('get', `/api/self-assessments?period_id=${period.id}`, 'teacher')
    expect(r.body.status).toBe('draft')
    await api('put', '/api/self-assessments', 'teacher').send({ period_id: period.id, items: fullItems(), submit: true })
  })

  // ---------------- Results ----------------
  it('กรรมการให้คะแนน: ตรวจช่วงคะแนน, สิทธิ์, ส่งครบแล้วล็อก', async () => {
    const scoreInd = indicators.find((i) => i.type === 'score_1_4')
    let r = await api('put', '/api/results', 'eval').send({ period_id: period.id, evaluatee_id: users.teacher, items: [{ indicator_id: scoreInd.id, score: 9 }] })
    expect(r.status).toBe(422)
    r = await api('put', '/api/results', 'eval2').send({ period_id: period.id, evaluatee_id: users.teacher, items: [] })
    expect(r.status).toBe(403)
    r = await api('put', '/api/results', 'teacher').send({ period_id: period.id, evaluatee_id: users.teacher, items: [] })
    expect(r.status).toBe(403)

    // ให้ทุกตัวชี้วัดแบบคะแนน = 3/4 (75%), มี/ไม่มี = มี (100%)
    const items = indicators.map((i) => (i.type === 'score_1_4' ? { indicator_id: i.id, score: 3, notes: 'ดี' } : { indicator_id: i.id, value_yes_no: 1 }))
    r = await api('put', '/api/results', 'eval').send({ period_id: period.id, evaluatee_id: users.teacher, items, comment: 'ข้อเสนอแนะทดสอบ' })
    expect(r.body.status).toBe('draft')

    // ครูยังไม่เห็นข้อเสนอแนะ/คะแนนจนกว่าจะส่ง
    r = await api('get', `/api/reports/evaluatee/${users.teacher}?period_id=${period.id}`, 'teacher')
    expect(r.body.data.totals.percent).toBeNull()
    expect(r.body.data.feedback).toEqual([])

    r = await api('put', '/api/results', 'eval').send({ period_id: period.id, evaluatee_id: users.teacher, items, comment: 'ข้อเสนอแนะทดสอบ', submit: true })
    expect(r.body.status).toBe('submitted')
    r = await api('put', '/api/results', 'eval').send({ period_id: period.id, evaluatee_id: users.teacher, items })
    expect(r.status).toBe(409)
  })

  it('รายงานรายบุคคลคำนวณคะแนนถูกต้อง และกันสิทธิ์', async () => {
    const r = await api('get', `/api/reports/evaluatee/${users.teacher}?period_id=${period.id}`, 'teacher')
    expect(r.status).toBe(200)
    const d = r.body.data
    expect(d.completed).toBe(true)
    expect(d.self_status).toBe('submitted')
    expect(d.self_totals.percent).toBe(100)
    expect(d.feedback[0].comment).toBe('ข้อเสนอแนะทดสอบ')

    // คำนวณคะแนนที่คาดไว้จากโครงสร้างจริง
    // ด้าน = เฉลี่ยถ่วงน้ำหนักตัวชี้วัด, รวม = เฉลี่ยถ่วงน้ำหนักด้าน
    const topicPercent = (t) =>
      t.indicators.reduce((a, i) => a + (i.type === 'score_1_4' ? (3 / i.max_score) * 100 : 100) * i.weight, 0) /
      t.indicators.reduce((a, i) => a + i.weight, 0)
    const wSum = topics.reduce((s, t) => s + t.weight, 0)
    const expected = topics.reduce((s, t) => s + topicPercent(t) * t.weight, 0) / wSum
    expect(d.totals.percent).toBeCloseTo(expected, 1)

    for (const who of ['teacher2', 'eval2']) {
      expect((await api('get', `/api/reports/evaluatee/${users.teacher}?period_id=${period.id}`, who)).status, who).toBe(403)
    }
  })

  it('สรุปผล: admin เห็นทุกคน กรรมการเห็นเฉพาะที่รับผิดชอบ ครูเข้าไม่ได้', async () => {
    let r = await api('get', `/api/reports/summary?period_id=${period.id}`, 'admin')
    const mine = r.body.data.find((x) => x.evaluatee_id === users.teacher)
    expect(mine.evaluators_submitted).toBe(1)
    expect(mine.percent).not.toBeNull()
    r = await api('get', `/api/reports/summary?period_id=${period.id}`, 'eval2')
    expect(r.body.data).toEqual([])
    expect((await api('get', `/api/reports/summary?period_id=${period.id}`, 'teacher')).status).toBe(403)
  })

  it('หลังกรรมการส่งผล ครูลบหลักฐานของตัวชี้วัดนั้นไม่ได้ / ปิดรอบแล้วแก้ไขไม่ได้', async () => {
    expect((await api('delete', `/api/attachments/${fileId}`, 'teacher')).status).toBe(409)
    await db('evaluation_periods').where({ id: period.id }).update({ is_active: 0 })
    const r = await api('put', '/api/self-assessments', 'teacher2').send({ period_id: period.id, items: [] })
    expect(r.status).toBe(409)
    await db('evaluation_periods').where({ id: period.id }).update({ is_active: 1 })
  })

  it('ยกเลิกการจับคู่ที่มีผลคะแนนต้องยืนยัน force', async () => {
    const a = await db('assignments').where({ period_id: period.id, evaluator_id: users.eval, evaluatee_id: users.teacher }).first()
    expect((await api('delete', `/api/assignments/${a.id}`, 'admin')).status).toBe(409)
    expect((await api('delete', `/api/assignments/${a.id}?force=1`, 'admin')).status).toBe(200)
    expect(await db('evaluation_results').where({ period_id: period.id, evaluatee_id: users.teacher }).first()).toBeUndefined()
  })

  it('แดชบอร์ดตอบตามบทบาท', async () => {
    const a = await api('get', `/api/dashboard?period_id=${period.id}`, 'admin')
    expect(a.body.data.users).toBeTruthy()
    const e = await api('get', `/api/dashboard?period_id=${period.id}`, 'eval')
    expect(e.body.data.my.total).toBe(1)
    const t = await api('get', `/api/dashboard?period_id=${period.id}`, 'teacher2')
    expect(t.body.data.me.evaluatee_id).toBe(users.teacher2)
  })
})
