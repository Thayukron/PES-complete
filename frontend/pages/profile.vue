<template>
  <div>
    <PageHeader title="ข้อมูลส่วนตัว" subtitle="แก้ไขชื่อที่แสดงและเปลี่ยนรหัสผ่าน" />
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>ข้อมูลบัญชี</v-card-title>
          <v-card-text>
            <v-form ref="profileForm" @submit.prevent="saveProfile">
              <v-text-field v-model="name" label="ชื่อ-นามสกุล" :rules="[(v) => !!v?.trim() || 'กรุณากรอกชื่อ']" class="mb-2" />
              <v-text-field :model-value="auth.user?.email" label="อีเมล (Email)" disabled class="mb-2" />
              <v-text-field :model-value="roleLabel(auth.role)" label="บทบาท" disabled class="mb-2" />
              <v-text-field :model-value="auth.user?.department_name || '-'" label="แผนกวิชา" disabled class="mb-2" />
              <v-text-field :model-value="auth.user?.org_group_name || '-'" label="ฝ่าย" disabled />
              <v-btn type="submit" color="primary" :loading="savingProfile" prepend-icon="mdi-content-save">บันทึก</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>เปลี่ยนรหัสผ่าน</v-card-title>
          <v-card-text>
            <v-form ref="pwForm" @submit.prevent="changePassword">
              <v-text-field v-model="pw.current" label="รหัสผ่านปัจจุบัน" type="password" autocomplete="current-password" :rules="[req]" class="mb-2" />
              <v-text-field
                v-model="pw.next"
                label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
                type="password"
                autocomplete="new-password"
                :rules="[req, (v) => (v || '').length >= 8 || 'อย่างน้อย 8 ตัวอักษร']"
                class="mb-2"
              />
              <v-text-field
                v-model="pw.confirm"
                label="ยืนยันรหัสผ่านใหม่"
                type="password"
                autocomplete="new-password"
                :rules="[req, (v) => v === pw.next || 'รหัสผ่านไม่ตรงกัน']"
              />
              <v-btn type="submit" color="primary" :loading="savingPw" prepend-icon="mdi-lock-reset">เปลี่ยนรหัสผ่าน</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
definePageMeta({ title: 'ข้อมูลส่วนตัว' })
const auth = useAuthStore()
const { $api } = useNuxtApp()
const notify = useNotify()
const req = (v) => !!v || 'กรุณากรอกข้อมูล'

const profileForm = ref()
const pwForm = ref()
const name = ref(auth.user?.name || '')
const pw = reactive({ current: '', next: '', confirm: '' })
const savingProfile = ref(false)
const savingPw = ref(false)

async function saveProfile() {
  if (!(await profileForm.value.validate()).valid) return
  savingProfile.value = true
  try {
    const { data } = await $api.put('/api/auth/me', { name_th: name.value })
    auth.setUser(data.data)
    notify.success('บันทึกข้อมูลเรียบร้อย')
  } catch (e) {
    notify.apiError(e)
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  if (!(await pwForm.value.validate()).valid) return
  savingPw.value = true
  try {
    await $api.put('/api/auth/password', { current_password: pw.current, new_password: pw.next })
    notify.success('เปลี่ยนรหัสผ่านเรียบร้อย')
    pwForm.value.reset()
  } catch (e) {
    notify.apiError(e)
  } finally {
    savingPw.value = false
  }
}
</script>
