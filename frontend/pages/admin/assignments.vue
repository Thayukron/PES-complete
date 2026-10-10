<template>
  <div>
    <PageHeader title="จับคู่กรรมการ" subtitle="กำหนดว่ากรรมการท่านใดประเมินครูท่านใดในแต่ละรอบ">
      <PeriodSelect @change="load" />
      <v-btn color="primary" prepend-icon="mdi-account-multiple-plus" @click="openCreate">จับคู่กรรมการ</v-btn>
    </PageHeader>

    <v-card>
      <v-card-text class="pb-0">
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field v-model="search" label="ค้นหาชื่อกรรมการ/ครู/แผนก" prepend-inner-icon="mdi-magnify" clearable hide-details />
          </v-col>
          <v-col cols="12" md="6" class="d-flex align-center justify-md-end text-body-2 text-medium-emphasis">
            ทั้งหมด {{ items.length }} คู่ · ครู {{ evaluateeCount }} ท่าน · ครูที่ยังไม่มีกรรมการ {{ unassigned.length }} ท่าน
          </v-col>
        </v-row>
      </v-card-text>
      <v-data-table
        :headers="headers"
        :items="items"
        :search="search"
        :loading="loading"
        no-data-text="ยังไม่มีการจับคู่ในรอบนี้"
        items-per-page-text="แถวต่อหน้า"
      >
        <template #item.evaluator_name="{ item }">
          <div class="font-weight-medium">{{ item.evaluator_name }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.evaluator_email }}</div>
        </template>
        <template #item.evaluatee_name="{ item }">
          <div class="font-weight-medium">{{ item.evaluatee_name }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.evaluatee_email }}</div>
        </template>
        <template #item.department_name="{ item }">{{ item.department_name || '-' }}</template>
        <template #item.status="{ item }"><StatusChip :status="item.status" /></template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-link-variant-off" variant="text" size="small" color="error" title="ยกเลิกการจับคู่" @click="remove(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-card v-if="unassigned.length" class="mt-4">
      <v-card-title class="text-subtitle-1">ครูที่ยังไม่มีกรรมการในรอบนี้ ({{ unassigned.length }})</v-card-title>
      <v-card-text>
        <v-chip v-for="u in unassigned" :key="u.id" class="mr-2 mb-2" variant="outlined">{{ u.name_th }} · {{ u.department_name || '-' }}</v-chip>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog" max-width="640" persistent>
      <v-card>
        <v-card-title>จับคู่กรรมการกับครู</v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-autocomplete
              v-model="form.evaluator_id"
              :items="evaluators"
              item-value="id"
              :item-title="(u) => `${u.name_th} (${u.department_name || '-'})`"
              label="กรรมการ *"
              :rules="[(v) => !!v || 'กรุณาเลือกกรรมการ']"
              class="mb-2"
            />
            <v-select
              v-model="deptFilter"
              :items="departments"
              item-value="id"
              item-title="name_th"
              label="กรองครูตามแผนก (ไม่บังคับ)"
              clearable
              class="mb-2"
            />
            <v-autocomplete
              v-model="form.evaluatee_ids"
              :items="evaluateeOptions"
              item-value="id"
              :item-title="(u) => `${u.name_th} (${u.department_name || '-'})`"
              label="ครูผู้รับการประเมิน * (เลือกได้หลายท่าน)"
              multiple
              chips
              closable-chips
              :rules="[(v) => v.length > 0 || 'กรุณาเลือกอย่างน้อย 1 ท่าน']"
            />
            <v-btn size="small" variant="text" color="primary" @click="form.evaluatee_ids = evaluateeOptions.map((u) => u.id)">
              เลือกทั้งหมดในรายการ ({{ evaluateeOptions.length }})
            </v-btn>
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
const { selectedId, load: loadPeriods } = usePeriods()

const headers = [
  { title: 'กรรมการ', key: 'evaluator_name' },
  { title: 'ครูผู้รับการประเมิน', key: 'evaluatee_name' },
  { title: 'แผนกวิชา', key: 'department_name' },
  { title: 'สถานะการให้คะแนน', key: 'status' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]
const items = ref([])
const evaluators = ref([])
const evaluatees = ref([])
const departments = ref([])
const loading = ref(false)
const search = ref('')

const evaluateeCount = computed(() => new Set(items.value.map((i) => i.evaluatee_id)).size)
const unassigned = computed(() => {
  const ids = new Set(items.value.map((i) => i.evaluatee_id))
  return evaluatees.value.filter((u) => !ids.has(u.id) && u.status === 'active')
})

async function load() {
  loading.value = true
  try {
    await loadPeriods()
    if (!selectedId.value) return
    const { data } = await $api.get('/api/assignments', { params: { period_id: selectedId.value } })
    items.value = data.data
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}

async function loadUsers() {
  const get = (role) => $api.get('/api/users', { params: { role, itemsPerPage: -1, sortBy: 'name_th', sortDesc: false } })
  const [er, ee, lk] = await Promise.all([get('evaluator'), get('evaluatee'), $api.get('/api/lookups')])
  evaluators.value = er.data.items.filter((u) => u.status === 'active')
  evaluatees.value = ee.data.items
  departments.value = lk.data.data.departments
}

onMounted(async () => {
  await load()
  try { await loadUsers() } catch (e) { notify.apiError(e) }
})

const dialog = ref(false)
const saving = ref(false)
const formRef = ref()
const deptFilter = ref(null)
const form = ref({ evaluator_id: null, evaluatee_ids: [] })
const evaluateeOptions = computed(() =>
  evaluatees.value.filter((u) => u.status === 'active' && (!deptFilter.value || u.department_id === deptFilter.value))
)

function openCreate() {
  if (!selectedId.value) return notify.error('กรุณาสร้าง/เลือกรอบการประเมินก่อน')
  form.value = { evaluator_id: null, evaluatee_ids: [] }
  deptFilter.value = null
  dialog.value = true
}

async function save() {
  if (!(await formRef.value.validate()).valid) return
  saving.value = true
  try {
    const { data } = await $api.post('/api/assignments', { period_id: selectedId.value, ...form.value })
    notify.success(`จับคู่เพิ่ม ${data.added} คู่` + (data.skipped ? ` (มีอยู่แล้ว ${data.skipped} คู่)` : ''))
    dialog.value = false
    load()
  } catch (e) {
    notify.apiError(e)
  } finally {
    saving.value = false
  }
}

async function remove(a) {
  const ok = await confirm({ title: 'ยกเลิกการจับคู่', text: `ยกเลิกให้ ${a.evaluator_name} ประเมิน ${a.evaluatee_name} ใช่หรือไม่?`, okText: 'ยกเลิกการจับคู่', color: 'error' })
  if (!ok) return
  try {
    await $api.delete(`/api/assignments/${a.id}`)
  } catch (e) {
    if (e.response?.status !== 409) return notify.apiError(e)
    const force = await confirm({
      title: 'กรรมการเริ่มให้คะแนนแล้ว',
      text: `${e.response.data.message}\nต้องการยืนยันลบการจับคู่และผลคะแนนของคู่นี้หรือไม่?`,
      okText: 'ลบทั้งหมด',
      color: 'error',
    })
    if (!force) return
    try { await $api.delete(`/api/assignments/${a.id}`, { params: { force: 1 } }) } catch (e2) { return notify.apiError(e2) }
  }
  notify.success('ยกเลิกการจับคู่เรียบร้อย')
  load()
}
</script>
