<template>
  <div>
    <PageHeader title="ผู้ใช้งาน" subtitle="เพิ่ม แก้ไข ปิดการใช้งาน และรีเซ็ตรหัสผ่านของผู้ใช้">
      <v-btn color="primary" prepend-icon="mdi-account-plus" @click="openCreate">เพิ่มผู้ใช้</v-btn>
    </PageHeader>

    <v-card>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="5">
            <v-text-field v-model="filters.search" label="ค้นหาชื่อหรืออีเมล" prepend-inner-icon="mdi-magnify" clearable hide-details />
          </v-col>
          <v-col cols="12" sm="4" md="3">
            <v-select v-model="filters.role" :items="roleItems" label="บทบาท" clearable hide-details />
          </v-col>
          <v-col cols="12" sm="4" md="2">
            <v-select v-model="filters.status" :items="statusItems" label="สถานะ" clearable hide-details />
          </v-col>
          <v-col cols="12" sm="4" md="2">
            <v-select v-model="filters.department_id" :items="lookups.departments" item-title="name_th" item-value="id" label="แผนกวิชา" clearable hide-details />
          </v-col>
        </v-row>
      </v-card-text>

      <v-data-table-server
        v-model:options="options"
        :headers="headers"
        :items="items"
        :items-length="total"
        :loading="loading"
        :items-per-page-options="[10, 25, 50, 100]"
        no-data-text="ไม่พบผู้ใช้"
        loading-text="กำลังโหลด..."
        items-per-page-text="แถวต่อหน้า"
      >
        <template #item.name_th="{ item }">
          <div class="font-weight-medium">{{ item.name_th }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
        </template>
        <template #item.role="{ item }">
          <v-chip size="small" :color="ROLE_COLORS[item.role]" variant="tonal">{{ roleLabel(item.role) }}</v-chip>
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" :color="item.status === 'active' ? 'success' : 'grey'" variant="tonal">
            {{ item.status === 'active' ? 'ใช้งาน' : 'ปิดการใช้งาน' }}
          </v-chip>
        </template>
        <template #item.department_name="{ item }">{{ item.department_name || '-' }}</template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" variant="text" size="small" title="แก้ไข" @click="openEdit(item)" />
          <v-btn icon="mdi-lock-reset" variant="text" size="small" title="รีเซ็ตรหัสผ่าน" @click="openReset(item)" />
          <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" title="ลบ" :disabled="item.id === auth.user?.id" @click="remove(item)" />
        </template>
      </v-data-table-server>
    </v-card>

    <!-- ฟอร์มเพิ่ม/แก้ไข -->
    <v-dialog v-model="dialog" max-width="560" persistent>
      <v-card>
        <v-card-title>{{ form.id ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้' }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <v-text-field v-model="form.name_th" label="ชื่อ-นามสกุล *" :rules="[req]" class="mb-2" />
            <v-text-field v-model="form.email" label="อีเมล (Email) *" type="email" :rules="[req, emailRule]" class="mb-2" />
            <v-text-field v-if="!form.id" v-model="form.password" label="รหัสผ่าน * (อย่างน้อย 8 ตัวอักษร)" type="text" :rules="[req, pwRule]" class="mb-2" />
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-select v-model="form.role" :items="roleItems" label="บทบาท *" :rules="[req]" :disabled="form.id === auth.user?.id" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="form.status" :items="statusItems" label="สถานะ" :disabled="form.id === auth.user?.id" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="form.department_id" :items="lookups.departments" item-title="name_th" item-value="id" label="แผนกวิชา" clearable />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="form.org_group_id" :items="lookups.org_groups" item-title="name_th" item-value="id" label="ฝ่าย" clearable />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">ยกเลิก</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="save">บันทึก</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- รีเซ็ตรหัสผ่าน -->
    <v-dialog v-model="resetDialog" max-width="440" persistent>
      <v-card>
        <v-card-title>รีเซ็ตรหัสผ่าน</v-card-title>
        <v-card-subtitle>{{ resetUser?.name_th }} ({{ resetUser?.email }})</v-card-subtitle>
        <v-card-text>
          <v-form ref="resetRef" @submit.prevent="doReset">
            <v-text-field v-model="newPassword" label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)" :rules="[req, pwRule]">
              <template #append-inner>
                <v-btn icon="mdi-dice-multiple-outline" size="small" variant="text" title="สุ่มรหัสผ่าน" @click="newPassword = randomPassword()" />
              </template>
            </v-text-field>
            <div class="text-caption text-medium-emphasis">แจ้งรหัสผ่านใหม่ให้ผู้ใช้ และแนะนำให้เปลี่ยนหลังเข้าสู่ระบบ</div>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="resetDialog = false">ยกเลิก</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="doReset">รีเซ็ต</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
definePageMeta({ roles: ['admin'] })

const { $api } = useNuxtApp()
const auth = useAuthStore()
const notify = useNotify()
const confirm = useConfirm()

const req = (v) => !!(v ?? '').toString().trim() || 'กรุณากรอกข้อมูล'
const emailRule = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '') || 'รูปแบบอีเมลไม่ถูกต้อง'
const pwRule = (v) => (v || '').length >= 8 || 'อย่างน้อย 8 ตัวอักษร'

const roleItems = Object.entries(ROLE_LABELS).map(([value, title]) => ({ value, title }))
const statusItems = [{ value: 'active', title: 'ใช้งาน' }, { value: 'disabled', title: 'ปิดการใช้งาน' }]
const headers = [
  { title: 'ID', key: 'id', width: 70 },
  { title: 'ชื่อ-นามสกุล / อีเมล', key: 'name_th' },
  { title: 'บทบาท', key: 'role' },
  { title: 'แผนกวิชา', key: 'department_name' },
  { title: 'สถานะ', key: 'status' },
  { title: 'จัดการ', key: 'actions', sortable: false, align: 'end', width: 150 },
]

const lookups = ref({ departments: [], org_groups: [] })
const items = ref([])
const total = ref(0)
const loading = ref(false)
const options = ref({ page: 1, itemsPerPage: 10, sortBy: [{ key: 'id', order: 'desc' }] })
const filters = reactive({ search: '', role: null, status: null, department_id: null })

async function load() {
  loading.value = true
  try {
    const sort = options.value.sortBy?.[0]
    const { data } = await $api.get('/api/users', {
      params: {
        page: options.value.page,
        itemsPerPage: options.value.itemsPerPage,
        sortBy: sort?.key || 'id',
        sortDesc: (sort?.order || 'desc') === 'desc',
        search: filters.search || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        department_id: filters.department_id || undefined,
      },
    })
    items.value = data.items
    total.value = data.total
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}

watch(options, load, { deep: true })
let timer
watch(filters, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (options.value.page !== 1) options.value = { ...options.value, page: 1 }
    else load()
  }, 300)
})

// ตารางแบบ server จะส่ง options ครั้งแรกเองตอนแสดงผล จึงไม่ต้องเรียก load() ซ้ำที่นี่
onMounted(async () => {
  try { lookups.value = (await $api.get('/api/lookups')).data.data } catch (e) { notify.apiError(e) }
})

// ----- เพิ่ม/แก้ไข -----
const dialog = ref(false)
const saving = ref(false)
const formRef = ref()
const empty = () => ({ id: null, name_th: '', email: '', password: '', role: 'evaluatee', status: 'active', department_id: null, org_group_id: null })
const form = ref(empty())

function openCreate() {
  form.value = empty()
  dialog.value = true
}
function openEdit(u) {
  form.value = { ...empty(), ...u, password: '' }
  dialog.value = true
}

async function save() {
  if (!(await formRef.value.validate()).valid) return
  saving.value = true
  try {
    const { id, password, ...body } = form.value
    const payload = { name_th: body.name_th, email: body.email, role: body.role, status: body.status, department_id: body.department_id, org_group_id: body.org_group_id }
    if (id) await $api.put(`/api/users/${id}`, payload)
    else await $api.post('/api/users', { ...payload, password })
    notify.success(id ? 'บันทึกการแก้ไขเรียบร้อย' : 'เพิ่มผู้ใช้เรียบร้อย')
    dialog.value = false
    load()
  } catch (e) {
    notify.apiError(e)
  } finally {
    saving.value = false
  }
}

// ----- รีเซ็ตรหัสผ่าน -----
const resetDialog = ref(false)
const resetUser = ref(null)
const resetRef = ref()
const newPassword = ref('')
const randomPassword = () => Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(Math.random() * 90 + 10)

function openReset(u) {
  resetUser.value = u
  newPassword.value = randomPassword()
  resetDialog.value = true
}
async function doReset() {
  if (!(await resetRef.value.validate()).valid) return
  saving.value = true
  try {
    await $api.put(`/api/users/${resetUser.value.id}`, { password: newPassword.value })
    notify.success(`รีเซ็ตรหัสผ่านของ ${resetUser.value.name_th} เรียบร้อย`)
    resetDialog.value = false
  } catch (e) {
    notify.apiError(e)
  } finally {
    saving.value = false
  }
}

// ----- ลบ -----
async function remove(u) {
  const ok = await confirm({
    title: 'ลบผู้ใช้',
    text: `ต้องการลบ "${u.name_th}" ใช่หรือไม่?\nหากผู้ใช้มีข้อมูลการประเมินแล้ว ระบบจะไม่อนุญาตให้ลบ (ให้ใช้ปิดการใช้งานแทน)`,
    okText: 'ลบ',
    color: 'error',
  })
  if (!ok) return
  try {
    await $api.delete(`/api/users/${u.id}`)
    notify.success('ลบผู้ใช้เรียบร้อย')
    load()
  } catch (e) {
    notify.apiError(e)
  }
}
</script>
