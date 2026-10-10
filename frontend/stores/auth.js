// stores/auth.js — เก็บ token และข้อมูลผู้ใช้ที่ล็อกอิน (บันทึกใน localStorage)
import { defineStore } from 'pinia'

const KEY_TOKEN = 'pes_token'
const KEY_USER = 'pes_user'

export const useAuthStore = defineStore('auth', {
  state: () => ({ token: null, user: null }),
  getters: {
    isLogged: (s) => !!s.token,
    role: (s) => s.user?.role || null,
    isAdmin: (s) => s.user?.role === 'admin',
    isEvaluator: (s) => s.user?.role === 'evaluator',
    isEvaluatee: (s) => s.user?.role === 'evaluatee',
  },
  actions: {
    setAuth(token, user) {
      this.token = token
      this.user = user
      try {
        localStorage.setItem(KEY_TOKEN, token)
        localStorage.setItem(KEY_USER, JSON.stringify(user))
      } catch {}
    },
    setUser(user) {
      this.user = user
      try { localStorage.setItem(KEY_USER, JSON.stringify(user)) } catch {}
    },
    hydrate() {
      try {
        this.token = localStorage.getItem(KEY_TOKEN)
        this.user = JSON.parse(localStorage.getItem(KEY_USER) || 'null')
      } catch {
        this.token = null
        this.user = null
      }
    },
    logout() {
      this.token = null
      this.user = null
      try {
        localStorage.removeItem(KEY_TOKEN)
        localStorage.removeItem(KEY_USER)
      } catch {}
    },
  },
})
