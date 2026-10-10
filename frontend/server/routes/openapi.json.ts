export default defineEventHandler((event) =>
  proxyRequest(event, useRuntimeConfig(event).apiInternal.replace(/\/$/, '') + '/openapi.json')
)
