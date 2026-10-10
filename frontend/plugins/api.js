// plugins/api.js — axios สำหรับเรียก Backend (แนบ token อัตโนมัติ, หมดอายุแล้วพาไปหน้าเข้าสู่ระบบ)
import axios from 'axios'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  auth.hydrate()

  // baseURL ว่าง = เรียก /api ที่โดเมนเดียวกับหน้าเว็บ (Nuxt ส่งต่อให้ API)
  const api = axios.create({ baseURL: '', timeout: 60000 })

  api.interceptors.request.use((config) => {
    if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
    return config
  })

  api.interceptors.response.use(
    (res) => res,
    (err) => {
      const url = err.config?.url || ''
      if (err.response?.status === 401 && !url.includes('/api/auth/login')) {
        auth.logout()
        const route = useRouter().currentRoute.value
        if (route.path !== '/login') navigateTo({ path: '/login', query: { expired: '1', redirect: route.fullPath } })
      }
      return Promise.reject(err)
    }
  )

  return { provide: { api } }
})
