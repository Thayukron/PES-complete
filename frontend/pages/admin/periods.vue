<template>
  <div>
    <PageHeader title="รอบการประเมิน" subtitle="กำหนดรอบการประเมิน และเปิด/ปิดการรับหลักฐานและการให้คะแนน">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">เพิ่มรอบการประเมิน</v-btn>
    </PageHeader>

    <v-card>
      <v-data-table :headers="headers" :items="items" :loading="loading" no-data-text="ยังไม่มีรอบการประเมิน" items-per-page-text="แถวต่อหน้า">
        <template #item.name_th="{ item }">
          <div class="font-weight-medium">{{ item.name_th }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.code }}</div>
        </template>
        <template #item.range="{ item }">{{ thDate(item.start_date) }} – {{ thDate(item.end_date) }}</template>
        <template #item.is_active="{ item }">
          <v-switch :model-value="!!item.is_active" color="success" hide-details density="compact" inset @update:model-value="toggle(item, $event)">
            <template #label>{{ item.is_active ? 'เปิด' : 'ปิด' }}</template>
          </v-switch>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" variant="text" size="small" title="แก้ไข" @click="openEdit(item)" />
          <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" title="ลบ" @click="remove(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-alert type="info" variant="tonal" class="mt-4" density="compact">
      รอบที่ <strong>เปิด</strong> ครูจึงจะอัปโหลดหลักฐาน/ประเมินตนเองได้ และกรรมการจึงจะบันทึกคะแนนได้ เมื่อปิดรอบ ข้อมูลทั้งหมดจะเป็นแบบอ่านอย่างเดียว
    </v-alert>

    <v-dialog v-model="dialog" max-width="560" persistent>
      <v-card>
        <v-card-title>{{ form.id ? 'แก้ไขรอบการประเมิน' : 'เพิ่มรอบการประเมิน' }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <v-row dense>
              <v-col cols="12" sm="6"><v-text-field v-model="form.code" label="รหัสรอบ * (เช่น Y2569)" :rules="[req]" /></v-col>
              <v-col cols="12" sm="6"><v-text-field v-model.number="form.buddhist_year" label="ปี พ.ศ. *" type="number" :rules="[req]" /></v-col>
              <v-col cols="12"><v-text-field v-model="form.name_th" label="ชื่อรอบการประเมิน *" :rules="[req]" /></v-col>
              <v-col cols="12" sm="6"><v-text-field v-model="form.start_date" label="วันเริ่มต้น *" type="date" :rules="[req]" /></v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.end_date" label="วันสิ้นสุด *" type="date" :rules="[req, (v) => !form.start_date || v >= form.start_date || 'ต้องไม่ก่อนวันเริ่มต้น']" />
              </v-col>
              <v-col cols="12"><v-switch v-model="form.is_active" color="success" label="เปิดรอบการประเมิน" hide-details inset /></v-col>
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
  </div>
</template>

<script setup>
definePageMeta({ roles: ['admin'] })

const { $api } = useNuxtApp()
const notify = useNotify()
const confirm = useConfirm()
const { load: reloadPeriods } = usePeriods()
const req = (v) => !!(v ?? '').toString().trim() || 'กรุณากรอกข้อมูล'

const headers = [
  { title: 'รอบการประเมิน', key: 'name_th' },
  { title: 'ปี พ.ศ.', key: 'buddhist_year' },
  { title: 'ช่วงเวลา', key: 'range', sortable: false },
  { title: 'สถานะ', key: 'is_active' },
  { title: 'จัดการ', key: 'actions', sortable: false, align: 'end' },
]
const items = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    items.value = (await $api.get('/api/periods')).data.data
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const dialog = ref(false)
const saving = ref(false)
const formRef = ref()
const thisYear = new Date().getFullYear() + 543
const empty = () => ({ id: null, code: `Y${thisYear}`, name_th: `การประเมินครูประจำปี ${thisYear}`, buddhist_year: thisYear, start_date: '', end_date: '', is_active: true })
const form = ref(empty())

function openCreate() {
  form.value = empty()
  dialog.value = true
}
function openEdit(p) {
  form.value = { ...p, is_active: !!p.is_active }
  dialog.value = true
}

async function persist(p) {
  const body = { code: p.code, name_th: p.name_th, buddhist_year: p.buddhist_year, start_date: p.start_date, end_date: p.end_date, is_active: p.is_active }
  if (p.id) await $api.put(`/api/periods/${p.id}`, body)
  else await $api.post('/api/periods', body)
  await load()
  await reloadPeriods(true)
}

async function save() {
  if (!(await formRef.value.validate()).valid) return
  saving.value = true
  try {
    await persist(form.value)
    notify.success('บันทึกรอบการประเมินเรียบร้อย')
    dialog.value = false
  } catch (e) {
    notify.apiError(e)
  } finally {
    saving.value = false
  }
}

async function toggle(p, value) {
  try {
    await persist({ ...p, is_active: value })
    notify.success(value ? 'เปิดรอบการประเมินแล้ว' : 'ปิดรอบการประเมินแล้ว')
  } catch (e) {
    notify.apiError(e)
  }
}

async function remove(p) {
  if (!(await confirm({ title: 'ลบรอบการประเมิน', text: `ต้องการลบ "${p.name_th}" ใช่หรือไม่?`, okText: 'ลบ', color: 'error' }))) return
  try {
    await $api.delete(`/api/periods/${p.id}`)
    notify.success('ลบรอบการประเมินเรียบร้อย')
    await load()
    await reloadPeriods(true)
  } catch (e) {
    notify.apiError(e)
  }
}
</script>
