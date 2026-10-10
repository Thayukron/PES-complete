<template>
  <div>
    <PageHeader title="ติดตามความคืบหน้า" subtitle="สถานะการส่งหลักฐาน การประเมินตนเอง และการให้คะแนนของกรรมการ">
      <PeriodSelect @change="load" />
    </PageHeader>

    <v-row class="mb-2">
      <v-col cols="6" md="3"><StatCard label="ครูทั้งหมด" :value="rows.length" icon="mdi-account-group-outline" /></v-col>
      <v-col cols="6" md="3"><StatCard label="ส่งหลักฐานครบ" :value="rows.filter((r) => r.indicators_with_files >= r.indicators_total).length" icon="mdi-file-check-outline" color="indigo" /></v-col>
      <v-col cols="6" md="3"><StatCard label="ส่งประเมินตนเอง" :value="rows.filter((r) => r.self_status === 'submitted').length" icon="mdi-star-check-outline" color="teal" /></v-col>
      <v-col cols="6" md="3"><StatCard label="กรรมการประเมินครบ" :value="rows.filter(isDone).length" icon="mdi-check-decagram-outline" color="success" /></v-col>
    </v-row>

    <v-card>
      <v-card-text class="pb-0">
        <v-row dense>
          <v-col cols="12" md="5"><v-text-field v-model="search" label="ค้นหาชื่อครู" prepend-inner-icon="mdi-magnify" clearable hide-details /></v-col>
          <v-col cols="12" md="4">
            <v-select v-model="dept" :items="departments" item-title="name_th" item-value="id" label="แผนกวิชา" clearable hide-details />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="state" :items="stateItems" label="สถานะ" clearable hide-details />
          </v-col>
        </v-row>
      </v-card-text>
      <v-data-table
        :headers="headers"
        :items="filtered"
        :search="search"
        :loading="loading"
        item-value="evaluatee_id"
        show-expand
        no-data-text="ยังไม่มีครูที่ได้รับการจับคู่ในรอบนี้"
        items-per-page-text="แถวต่อหน้า"
      >
        <template #item.name_th="{ item }">
          <div class="font-weight-medium">{{ item.name_th }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.department_name || '-' }}</div>
        </template>
        <template #item.files="{ item }">
          <div class="text-body-2">{{ item.indicators_with_files }} / {{ item.indicators_total }} ตัวชี้วัด</div>
          <v-progress-linear :model-value="(100 * item.indicators_with_files) / (item.indicators_total || 1)" height="6" rounded color="indigo" />
        </template>
        <template #item.self_status="{ item }"><StatusChip :status="item.self_status" /></template>
        <template #item.evaluators="{ item }">
          <span :class="isDone(item) ? 'text-success font-weight-bold' : ''">{{ item.evaluators_submitted }} / {{ item.evaluators.length }} ท่าน</span>
        </template>
        <template #item.percent="{ item }"><LevelChip :percent="item.percent" :level="item.level" /></template>
        <template #item.actions="{ item }">
          <v-btn :to="`/report/${item.evaluatee_id}`" icon="mdi-file-document-outline" variant="text" size="small" title="ดูรายงาน" />
        </template>
        <template #expanded-row="{ columns, item }">
          <tr>
            <td :colspan="columns.length" class="py-3 bg-surface-light">
              <div class="d-flex flex-wrap ga-3 align-center mb-2">
                <strong>การประเมินตนเอง:</strong>
                <StatusChip :status="item.self_status" />
                <v-btn v-if="item.self_status === 'submitted'" size="small" variant="tonal" color="warning" prepend-icon="mdi-lock-open-variant-outline" @click="reopenSelf(item)">
                  เปิดให้ครูแก้ไข
                </v-btn>
              </div>
              <div v-for="e in item.evaluators" :key="e.id" class="d-flex flex-wrap ga-3 align-center mb-1">
                <v-icon icon="mdi-account-tie-outline" size="small" />
                <span>{{ e.name }}</span>
                <StatusChip :status="e.status" />
                <span class="text-caption text-medium-emphasis">ให้คะแนนแล้ว {{ e.scored }} / {{ item.indicators_total }}</span>
                <v-btn v-if="e.status === 'submitted'" size="small" variant="tonal" color="warning" prepend-icon="mdi-lock-open-variant-outline" @click="reopenResult(item, e)">
                  เปิดให้กรรมการแก้ไข
                </v-btn>
              </div>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup>
definePageMeta({ roles: ['admin'] })

const { $api } = useNuxtApp()
const notify = useNotify()
const confirm = useConfirm()
const { selectedId, load: loadPeriods } = usePeriods()

const headers = [
  { title: 'ครูผู้รับการประเมิน', key: 'name_th' },
  { title: 'หลักฐาน', key: 'files', sortable: false, width: 180 },
  { title: 'ประเมินตนเอง', key: 'self_status' },
  { title: 'กรรมการส่งผล', key: 'evaluators', sortable: false },
  { title: 'ผลรวม', key: 'percent' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]
const stateItems = [
  { value: 'done', title: 'ประเมินครบแล้ว' },
  { value: 'pending', title: 'ยังประเมินไม่ครบ' },
  { value: 'nofile', title: 'ยังไม่มีหลักฐาน' },
]

const rows = ref([])
const departments = ref([])
const loading = ref(false)
const search = ref('')
const dept = ref(null)
const state = ref(null)

const isDone = (r) => r.evaluators.length > 0 && r.evaluators_submitted === r.evaluators.length
const filtered = computed(() =>
  rows.value.filter((r) => {
    if (dept.value && r.department_id !== dept.value) return false
    if (state.value === 'done') return isDone(r)
    if (state.value === 'pending') return !isDone(r)
    if (state.value === 'nofile') return r.files_count === 0
    return true
  })
)

async function load() {
  loading.value = true
  try {
    await loadPeriods()
    if (!selectedId.value) return
    rows.value = (await $api.get('/api/reports/summary', { params: { period_id: selectedId.value } })).data.data
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  load()
  try { departments.value = (await $api.get('/api/lookups')).data.data.departments } catch {}
})

async function reopenSelf(item) {
  if (!(await confirm({ title: 'เปิดให้แก้ไขการประเมินตนเอง', text: `${item.name_th} จะสามารถแก้ไขและส่งแบบประเมินตนเองใหม่ได้`, okText: 'เปิดให้แก้ไข', color: 'warning' }))) return
  try {
    await $api.post('/api/self-assessments/reopen', { period_id: selectedId.value, evaluatee_id: item.evaluatee_id })
    notify.success('เปิดให้แก้ไขเรียบร้อย')
    load()
  } catch (e) {
    notify.apiError(e)
  }
}

async function reopenResult(item, e) {
  if (!(await confirm({ title: 'เปิดให้กรรมการแก้ไขผล', text: `${e.name} จะสามารถแก้ไขผลการประเมินของ ${item.name_th} และส่งใหม่ได้`, okText: 'เปิดให้แก้ไข', color: 'warning' }))) return
  try {
    await $api.post('/api/results/reopen', { period_id: selectedId.value, evaluatee_id: item.evaluatee_id, evaluator_id: e.id })
    notify.success('เปิดให้แก้ไขเรียบร้อย')
    load()
  } catch (err) {
    notify.apiError(err)
  }
}
</script>
