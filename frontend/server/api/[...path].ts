// ส่งต่อทุกคำขอ /api/** ไปยัง Backend API (หน้าเว็บกับ API จึงอยู่โดเมนเดียวกัน ไม่ติด CORS)
export default defineEventHandler((event) => {
  const target = useRuntimeConfig(event).apiInternal.replace(/\/$/, '')
  return proxyRequest(event, target + event.path)
})
