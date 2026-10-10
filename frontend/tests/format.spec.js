import { describe, it, expect } from 'vitest'
import { thDate, fileSize, pct, valueText, levelColor } from '../utils/format.js'

describe('utils/format', () => {
  it('แปลงวันที่เป็นรูปแบบไทย (พ.ศ.)', () => {
    expect(thDate('2025-10-01')).toBe('1 ต.ค. 2568')
    expect(thDate('2026-01-15 09:05:00', true)).toBe('15 ม.ค. 2569 09:05 น.')
    expect(thDate(null)).toBe('-')
  })
  it('แสดงขนาดไฟล์', () => {
    expect(fileSize(500)).toBe('500 B')
    expect(fileSize(2048)).toBe('2.0 KB')
    expect(fileSize(5 * 1024 * 1024)).toBe('5.00 MB')
  })
  it('แสดงร้อยละ', () => {
    expect(pct(87.5)).toBe('87.50%')
    expect(pct(null)).toBe('-')
  })
  it('แสดงค่าคะแนนตามชนิดตัวชี้วัด', () => {
    expect(valueText({ type: 'score_1_4', max_score: 4 }, { score: 3 })).toBe('3 / 4')
    expect(valueText({ type: 'yes_no' }, { value_yes_no: 1 })).toBe('มี')
    expect(valueText({ type: 'yes_no' }, { value_yes_no: 0 })).toBe('ไม่มี')
    expect(valueText({ type: 'yes_no' }, null)).toBe('-')
  })
  it('สีตามระดับผลการประเมิน', () => {
    expect(levelColor('ดีเยี่ยม')).toBe('success')
    expect(levelColor('ไม่รู้จัก')).toBe('grey')
  })
})
