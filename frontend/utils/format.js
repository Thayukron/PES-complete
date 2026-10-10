// utils/format.js — ฟังก์ชันแสดงผล (Nuxt auto-import ใช้ได้ทุกหน้า)

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

// '2025-10-01' หรือ '2025-10-01 14:30:00' -> '1 ต.ค. 2568' (+ เวลา)
export function thDate(value, withTime = false) {
  if (!value) return '-'
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/)
  if (!m) return String(value)
  const [, y, mo, d, hh, mm] = m
  let s = `${Number(d)} ${TH_MONTHS[Number(mo) - 1]} ${Number(y) + 543}`
  if (withTime && hh) s += ` ${hh}:${mm} น.`
  return s
}

export function fileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

export const ROLE_LABELS = { admin: 'ผู้ดูแลระบบ', evaluator: 'กรรมการประเมิน', evaluatee: 'ครูผู้รับการประเมิน' }
export const ROLE_COLORS = { admin: 'deep-purple', evaluator: 'indigo', evaluatee: 'teal' }
export const roleLabel = (r) => ROLE_LABELS[r] || r || '-'

export const STATUS = {
  none: { text: 'ยังไม่เริ่ม', color: 'grey', icon: 'mdi-circle-outline' },
  draft: { text: 'บันทึกร่าง', color: 'warning', icon: 'mdi-pencil-circle-outline' },
  submitted: { text: 'ส่งแล้ว', color: 'success', icon: 'mdi-check-circle' },
}

export const INDICATOR_TYPES = {
  score_1_4: 'ให้คะแนน (ระดับ)',
  yes_no: 'มี / ไม่มี',
  file_url: 'มีหลักฐาน / ไม่มี',
}

export function levelColor(level) {
  return { 'ดีเด่น': 'success', 'ดีมาก': 'teal', 'ดี': 'info', 'พอใช้': 'warning', 'ปรับปรุง': 'error' }[level] || 'grey'
}

export const pct = (v) => (v === null || v === undefined ? '-' : `${Number(v).toFixed(2)}%`)

// ค่าคะแนนของตัวชี้วัดแบบอ่านง่าย
export function valueText(indicator, v) {
  if (!v) return '-'
  if (indicator.type === 'score_1_4') return v.score === null || v.score === undefined ? '-' : `${Number(v.score)} / ${indicator.max_score}`
  if (v.value_yes_no === null || v.value_yes_no === undefined) return '-'
  return Number(v.value_yes_no) ? 'มี' : 'ไม่มี'
}

// สร้างไฟล์ CSV (มี BOM ให้ Excel อ่านภาษาไทยได้) แล้วดาวน์โหลด
export function downloadCsv(filename, headers, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  saveBlob(blob, filename)
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
