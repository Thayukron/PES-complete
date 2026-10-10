// middleware/auth.global.js — ตรวจการล็อกอินและบทบาทก่อนเข้าทุกหน้า
// กำหนดในหน้าได้ด้วย definePageMeta({ public: true }) หรือ definePageMeta({ roles: ['admin'] })
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (!auth.token) auth.hydrate()

  if (to.meta.public) {
    if (to.path === '/login' && auth.isLogged) return navigateTo('/')
    return
  }
  if (!auth.isLogged) {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} })
  }
  const roles = to.meta.roles
  if (Array.isArray(roles) && !roles.includes(auth.role)) {
    useNotify().error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
    return navigateTo('/')
  }
})
