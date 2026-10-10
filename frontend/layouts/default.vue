<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" :permanent="!mobile" :temporary="mobile" width="272">
      <div class="d-flex align-center ga-3 px-4 py-4">
        <v-avatar color="primary" rounded="lg" size="40"><v-icon icon="mdi-clipboard-check-multiple-outline" /></v-avatar>
        <div>
          <div class="font-weight-bold">ระบบประเมินบุคลากร</div>
          <div class="text-caption text-medium-emphasis">Personnel Evaluation System</div>
        </div>
      </div>
      <v-divider />
      <v-list nav density="comfortable">
        <template v-for="sec in menu" :key="sec.label">
          <v-list-subheader>{{ sec.label }}</v-list-subheader>
          <v-list-item
            v-for="it in sec.items"
            :key="it.to || it.href"
            :to="it.to"
            :href="it.href"
            :target="it.href ? '_blank' : undefined"
            :prepend-icon="it.icon"
            :title="it.label"
            :exact="it.to === '/'"
            color="primary"
            rounded="lg"
          />
        </template>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar flat border="b">
      <v-app-bar-nav-icon v-if="mobile" @click="drawer = !drawer" />
      <v-app-bar-title class="text-body-1 font-weight-medium">{{ pageTitle }}</v-app-bar-title>
      <v-btn icon :title="isDark ? 'โหมดสว่าง' : 'โหมดมืด'" @click="toggleTheme">
        <v-icon :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'" />
      </v-btn>
      <v-menu location="bottom end">
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" class="mr-2">
            <v-avatar color="primary" size="32" class="mr-2"><span class="text-body-2">{{ initial }}</span></v-avatar>
            <span class="d-none d-sm-inline">{{ auth.user?.name }}</span>
            <v-icon icon="mdi-chevron-down" end />
          </v-btn>
        </template>
        <v-card min-width="260">
          <v-card-text>
            <div class="font-weight-bold">{{ auth.user?.name }}</div>
            <div class="text-caption">{{ auth.user?.email }}</div>
            <v-chip class="mt-2" size="small" :color="ROLE_COLORS[auth.role]" variant="tonal">{{ roleLabel(auth.role) }}</v-chip>
          </v-card-text>
          <v-divider />
          <v-list density="compact">
            <v-list-item to="/profile" prepend-icon="mdi-account-circle-outline" title="ข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน" />
            <v-list-item prepend-icon="mdi-logout" title="ออกจากระบบ" base-color="error" @click="logout" />
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-4 pa-md-6" style="max-width: 1400px">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useDisplay, useTheme } from 'vuetify'

const auth = useAuthStore()
const menu = useMenu()
const route = useRoute()
const { mobile } = useDisplay()
const theme = useTheme()

const drawer = ref(!mobile.value)
watch(mobile, (m) => { drawer.value = !m })

const pageTitle = computed(() => {
  for (const sec of menu.value) {
    const hit = sec.items.find((i) => i.to && (i.to === '/' ? route.path === '/' : route.path.startsWith(i.to)))
    if (hit) return hit.label
  }
  return route.meta.title || 'ระบบประเมินบุคลากร'
})
const initial = computed(() => (auth.user?.name || '?').trim().charAt(0))

const isDark = computed(() => theme.global.current.value.dark)
function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark'
  theme.global.name.value = next
  try { localStorage.setItem('theme', next) } catch {}
}

function logout() {
  auth.logout()
  navigateTo('/login')
}

// รีเฟรชข้อมูลผู้ใช้จาก server (เผื่อชื่อ/สิทธิ์ถูกแก้ไข)
const { $api } = useNuxtApp()
onMounted(async () => {
  try {
    const { data } = await $api.get('/api/auth/me')
    auth.setUser(data.data)
  } catch {}
})
</script>
