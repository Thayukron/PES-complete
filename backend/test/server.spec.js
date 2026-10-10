import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../app.js'

describe('HEALTH / ROUTING', () => {
  it('GET /health ตอบสถานะ ok', async () => {
    const r = await request(app).get('/health')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ service: 'pes-api', status: 'ok' })
  })

  it('เส้นทางที่ไม่มีอยู่ตอบ 404 ภาษาไทย', async () => {
    const r = await request(app).get('/not-found')
    expect(r.status).toBe(404)
    expect(r.body.success).toBe(false)
  })

  it('API ที่ต้องล็อกอินตอบ 401 เมื่อไม่มี token', async () => {
    for (const url of ['/api/users', '/api/topics', '/api/dashboard', '/api/attachments/1/file']) {
      const r = await request(app).get(url)
      expect(r.status, url).toBe(401)
    }
  })

  it('token ไม่ถูกต้องตอบ 401', async () => {
    const r = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi')
    expect(r.status).toBe(401)
  })

  it('ไม่เปิดไฟล์อัปโหลดเป็น static', async () => {
    const r = await request(app).get('/uploads/1/test.pdf')
    expect(r.status).toBe(404)
  })

  it('login ไม่กรอกข้อมูลตอบ 400', async () => {
    const r = await request(app).post('/api/auth/login').send({})
    expect(r.status).toBe(400)
  })
})
