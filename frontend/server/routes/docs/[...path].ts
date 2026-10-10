// ส่งต่อหน้า Swagger (/docs/) ไปยัง API
export default defineEventHandler((event) =>
  proxyRequest(event, useRuntimeConfig(event).apiInternal.replace(/\/$/, '') + event.path)
)
