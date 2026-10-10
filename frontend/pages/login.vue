<template>
  <div class="login-bg d-flex align-center justify-center pa-4">
    <v-card width="420" class="pa-2" elevation="8">
      <v-card-item class="text-center pt-6">
        <v-avatar color="primary" size="64" rounded="lg" class="mb-3">
          <v-icon icon="mdi-clipboard-check-multiple-outline" size="36" />
        </v-avatar>
        <div class="text-h6 font-weight-bold">ระบบประเมินบุคลากร</div>
        <div class="text-body-2 text-medium-emphasis">Personnel Evaluation System (PES)</div>
      </v-card-item>

      <v-card-text>
        <v-alert v-if="route.query.expired" type="warning" variant="tonal" density="compact" class="mb-4">
          เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง
        </v-alert>
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>

        <v-form ref="formRef" @submit.prevent="submit">
          <v-text-field
            v-model="email"
            label="อีเมล"
            type="email"
            prepend-inner-icon="mdi-email-outline"
            autocomplete="username"
            :rules="[(v) => !!v || 'กรุณากรอกอีเมล', (v) => /.+@.+\..+/.test(v) || 'รูปแบบอีเมลไม่ถูกต้อง']"
            class="mb-2"
          />
          <v-text-field
            v-model="password"
            label="รหัสผ่าน"
            :type="showPw ? 'text' : 'password'"
            prepend-inner-icon="mdi-lock-outline"
            :append-inner-icon="showPw ? 'mdi-eye-off' : 'mdi-eye'"
            autocomplete="current-password"
            :rules="[(v) => !!v || 'กรุณากรอกรหัสผ่าน']"
            @click:append-inner="showPw = !showPw"
          />
          <v-btn type="submit" color="primary" size="large" block :loading="loading" class="mt-2">เข้าสู่ระบบ</v-btn>
        </v-form>
      </v-card-text>
      <v-card-text class="text-center text-caption text-medium-emphasis pt-0">
        ลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'blank', public: true })

const { $api } = useNuxtApp()
const auth = useAuthStore()
const route = useRoute()

const formRef = ref()
const email = ref('')
const password = ref('')
const showPw = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await $api.post('/api/auth/login', { email: email.value.trim(), password: password.value })
    auth.setAuth(data.accessToken, data.user)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    await navigateTo(redirect)
  } catch (e) {
    error.value = errorMessage(e, 'เข้าสู่ระบบไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, #0f172a 100%);
}
</style>
