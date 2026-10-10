// แจ้งเตือนแบบ snackbar ใช้ได้ทุกหน้า: useNotify().success('บันทึกแล้ว')
export function useNotify() {
  const state = useState('notify', () => ({ show: false, text: '', color: 'success', timeout: 3000 }))
  const show = (text, color = 'success', timeout = 3000) => {
    state.value = { show: true, text, color, timeout }
  }
  return {
    state,
    success: (t) => show(t, 'success'),
    error: (t) => show(t, 'error', 6000),
    info: (t) => show(t, 'info'),
    // แสดงข้อความ error จาก API (axios) แบบอ่านง่าย
    apiError: (e, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่') => show(errorMessage(e, fallback), 'error', 6000),
  }
}

export function errorMessage(e, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่') {
  if (e?.response?.data?.message) return e.response.data.message
  if (e?.code === 'ECONNABORTED') return 'การเชื่อมต่อใช้เวลานานเกินไป'
  if (e?.message === 'Network Error' || e?.response?.status === 502 || e?.response?.status === 503) {
    return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
  }
  return fallback
}
