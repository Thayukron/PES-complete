import { describe, it, expect } from 'vitest'
import { indicatorPercent, weightedAverage, levelOf, computeTotals, averageValues } from '../utils/scoring.js'

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
    expect(levelOf(95)).toBe('ดีเยี่ยม')
    expect(levelOf(90)).toBe('ดีเยี่ยม')
    expect(levelOf(85)).toBe('ดีมาก')
    expect(levelOf(70)).toBe('ดี')
    expect(levelOf(60)).toBe('พอใช้')
    expect(levelOf(59.99)).toBe('ต้องปรับปรุง')
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
})
