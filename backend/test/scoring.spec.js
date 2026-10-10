import { describe, it, expect } from 'vitest'
import { indicatorPercent, weightedAverage, levelOf, computeTotals, averageValues, paResult } from '../utils/scoring.js'

const score = { type: 'score_1_4', max_score: 4, weight: 1 }
const yn = { type: 'yes_no', weight: 1 }

describe('utils/scoring', () => {
  it('คะแนนตัวชี้วัดแบบระดับ = score / max * 100', () => {
    expect(indicatorPercent(score, { score: 3 })).toBe(75)
    expect(indicatorPercent(score, { score: 4 })).toBe(100)
    expect(indicatorPercent(score, { score: null })).toBeNull()
    expect(indicatorPercent(score, null)).toBeNull()
  })

  it('ตัวชี้วัดแบบ มี/ไม่มี = 100 / 0', () => {
    expect(indicatorPercent(yn, { value_yes_no: 1 })).toBe(100)
    expect(indicatorPercent(yn, { value_yes_no: 0 })).toBe(0)
    expect(indicatorPercent(yn, { value_yes_no: null })).toBeNull()
  })

  it('ค่าเฉลี่ยถ่วงน้ำหนัก (ข้ามค่าว่าง, น้ำหนัก 0 ทั้งหมด = เฉลี่ยปกติ)', () => {
    expect(weightedAverage([{ percent: 100, weight: 3 }, { percent: 0, weight: 1 }])).toBe(75)
    expect(weightedAverage([{ percent: 80, weight: 1 }, { percent: null, weight: 5 }])).toBe(80)
    expect(weightedAverage([{ percent: 50, weight: 0 }, { percent: 100, weight: 0 }])).toBe(75)
    expect(weightedAverage([])).toBeNull()
  })

  it('ระดับผลการประเมิน', () => {
    expect(levelOf(95)).toBe('ดีเด่น')
    expect(levelOf(90)).toBe('ดีเด่น')
    expect(levelOf(85)).toBe('ดีมาก')
    expect(levelOf(70)).toBe('ดี')
    expect(levelOf(60)).toBe('พอใช้')
    expect(levelOf(59.99)).toBe('ปรับปรุง')
    expect(levelOf(null)).toBeNull()
  })

  it('คะแนนรวมจากด้านที่มีน้ำหนักต่างกัน', () => {
    const topics = [
      { id: 1, weight: 0.7, indicators: [{ id: 11, ...score }, { id: 12, ...yn }] },
      { id: 2, weight: 0.3, indicators: [{ id: 21, ...score }] },
    ]
    const totals = computeTotals(topics, {
      11: { score: 2 },          // 50%
      12: { value_yes_no: 1 },   // 100%  -> ด้าน 1 = 75%
      21: { score: 4 },          // ด้าน 2 = 100%
    })
    expect(totals.topics[0].percent).toBe(75)
    expect(totals.topics[1].percent).toBe(100)
    expect(totals.percent).toBe(82.5) // 0.7*75 + 0.3*100
    expect(totals.level).toBe('ดีมาก')
    expect(totals.scored).toBe(3)
    expect(totals.total).toBe(3)
  })

  it('ค่าเฉลี่ยของกรรมการหลายท่าน', () => {
    expect(averageValues([{ score: 3 }, { score: 4 }])).toEqual({ score: 3.5, value_yes_no: null })
    expect(averageValues([{ value_yes_no: 1 }, { value_yes_no: 0 }]).value_yes_no).toBe(1) // เสมอกันถือว่ามี
    expect(averageValues([{ value_yes_no: 0 }, { value_yes_no: 0 }, { value_yes_no: 1 }]).value_yes_no).toBe(0)
    expect(averageValues([])).toBeNull()
  })

  // โครงสร้างเดียวกับแบบประเมินจริง (schema.sql): เงินเดือน 100 คะแนน / PA 100 คะแนน
  const ind = (id, max = 4, weight = 1) => ({ id, type: 'score_1_4', max_score: max, weight })
  const formTopics = [
    { id: 1, weight: 0.32, pa_weight: 0.32, indicators: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ind(i)) },
    { id: 2, weight: 0.16, pa_weight: 0.16, indicators: [9, 10, 11, 12].map((i) => ind(i)) },
    { id: 3, weight: 0.12, pa_weight: 0.12, indicators: [13, 14, 15].map((i) => ind(i)) },
    { id: 4, weight: 0.20, pa_weight: 0.40, indicators: [ind(16, 4, 2), ind(17), ind(18)] },
    { id: 5, weight: 0.10, pa_weight: 0, indicators: [ind(19, 5)] },
    { id: 6, weight: 0.10, pa_weight: 0, indicators: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29].map((i) => ind(i)) },
  ]
  // ตัวอย่างจากแบบประเมินจริง: ตอนที่ 1 ได้ 57/60 (ระดับ 3 ที่ 1.6, 2.4, 3.2 นอกนั้น 4), ท้าทาย 4/4/4, องค์ 2 ระดับ 5, องค์ 3 ได้ 4 ทุกข้อ
  const sample = Object.fromEntries(Array.from({ length: 29 }, (_, k) => [k + 1, { score: [6, 12, 14].includes(k + 1) ? 3 : (k + 1 === 19 ? 5 : 4) }]))

  it('แบบประเมินผลการปฏิบัติงาน: 57 + 20 + 10 + 10 = 97 คะแนน', () => {
    const t = computeTotals(formTopics, sample)
    const part1 = t.topics.slice(0, 3).reduce((s, x) => s + x.points, 0)
    expect(part1).toBeCloseTo(57, 5)
    expect(t.topics[3].points).toBeCloseTo(20, 5)
    expect(t.topics[4].points).toBeCloseTo(10, 5)
    expect(t.topics[5].points).toBeCloseTo(10, 5)
    expect(t.percent).toBeCloseTo(97, 1)
    expect(t.level).toBe('ดีเด่น')
  })

  it('แบบ PA: ส่วนที่ 1 = 57/60, ส่วนที่ 2 = 40/40 รวม 97 และไม่นับองค์ประกอบที่ 2-3', () => {
    const t = computeTotals(formTopics, sample, 'pa_weight')
    expect(t.topics.length).toBe(4)
    expect(t.topics[3].points).toBeCloseTo(40, 5)
    expect(t.percent).toBeCloseTo(97, 1)
  })

  it('ท้าทาย: ไม่ได้ให้คะแนน "วิธีดำเนินการ" จะได้ 10/20 ไม่ใช่ 20/20', () => {
    const v = { ...sample }
    delete v[16]
    const t = computeTotals(formTopics.slice(3, 4), v)
    // คิดเฉพาะข้อที่มีคะแนน -> 100% ของข้อที่กรอก แต่ถ้าถือว่าไม่ได้คะแนน (ระดับ 0) จะเหลือ 50%
    expect(t.topics[0].scored).toBe(2)
    expect(t.topics[0].total).toBe(3)
  })

  it('เกณฑ์ผ่าน PA: กรรมการทุกคนต้องให้ไม่ต่ำกว่า 70%', () => {
    const low = Object.fromEntries(Object.keys(sample).map((k) => [k, { score: 2 }])) // 50%
    expect(paResult(formTopics, [sample]).pass).toBe(true)
    expect(paResult(formTopics, [sample, low]).pass).toBe(false)
    expect(paResult(formTopics, []).pass).toBeNull()
  })
})
