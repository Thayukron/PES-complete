// nuxt.config.ts
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  compatibilityDate: '2025-10-12',
  // ระบบภายในที่ต้องล็อกอิน -> ใช้โหมด SPA (ไม่ต้องเรนเดอร์ฝั่ง server, ไม่มีปัญหา localStorage)
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],

  app: {
    head: {
      htmlAttrs: { lang: 'th' },
      title: 'ระบบประเมินบุคลากร',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  runtimeConfig: {
    // ที่อยู่ API ภายใน (ฝั่ง server ของ Nuxt ใช้ส่งต่อคำขอ /api/**) — override ด้วย env NUXT_API_INTERNAL
    apiInternal: 'http://localhost:7000',
    public: {
      appName: 'ระบบประเมินบุคลากร (PES)',
    },
  },

  css: ['vuetify/styles', '@mdi/font/css/materialdesignicons.min.css', '~/assets/main.css'],
  build: { transpile: ['vuetify'] },
  vite: {
    plugins: [vuetify({ autoImport: true })],
    vue: { template: { transformAssetUrls } },
  },
})
