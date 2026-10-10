// plugins/vuetify.js — ธีม สี ภาษาไทย และค่าเริ่มต้นของคอมโพเนนต์
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { th } from 'vuetify/locale'

const light = {
  dark: false,
  colors: {
    background: '#f5f7fb', surface: '#ffffff', primary: '#1e40af', secondary: '#475569',
    error: '#dc2626', info: '#0284c7', success: '#15803d', warning: '#b45309',
  },
}
const dark = {
  dark: true,
  colors: {
    background: '#0b1220', surface: '#111827', primary: '#60a5fa', secondary: '#94a3b8',
    error: '#f87171', info: '#38bdf8', success: '#4ade80', warning: '#fbbf24',
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  let saved = 'light'
  try { saved = localStorage.getItem('theme') || 'light' } catch {}

  const vuetify = createVuetify({
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
    locale: { locale: 'th', messages: { th } },
    theme: { defaultTheme: saved, themes: { light, dark } },
    defaults: {
      VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
      VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
      VAutocomplete: { variant: 'outlined', density: 'comfortable', color: 'primary' },
      VTextarea: { variant: 'outlined', density: 'comfortable', color: 'primary', rows: 3, autoGrow: true },
      VFileInput: { variant: 'outlined', density: 'comfortable', color: 'primary' },
      VCard: { rounded: 'lg' },
      VBtn: { rounded: 'lg' },
    },
  })
  nuxtApp.vueApp.use(vuetify)
})
