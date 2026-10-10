<template>
  <div>
    <PageHeader title="รายชื่อผู้รับการประเมิน" subtitle="ครูที่คุณได้รับมอบหมายให้ประเมินในรอบนี้">
      <PeriodSelect @change="load" />
    </PageHeader>

    <v-alert v-if="selected && !selected.is_active" type="info" variant="tonal" density="compact" class="mb-4">
      รอบการประเมินนี้ปิดแล้ว ดูข้อมูลได้อย่างเดียว
    </v-alert>

    <v-card>
      <v-card-text class="pb-0">
        <v-row dense>
          <v-col cols="12" md="6"><v-text-field v-model="search" label="ค้นหาชื่อครู/แผนก" prepend-inner-icon="mdi-magnify" clearable hide-details /></v-col>
          <v-col cols="12" md="6">
            <v-btn-toggle v-model="filter" color="primary" variant="outlined" density="comfortable" divided mandatory>
              <v-btn value="all">ทั้งหมด ({{ rows.length }})</v-btn>
              <v-btn value="pending">ยังไม่ส่ง ({{ rows.filter((r) => r.my_status !== 'submitted').length }})</v-btn>
              <v-btn value="submitted">ส่งแล้ว ({{ rows.filter((r) => r.my_status === 'submitted').length }})</v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
      <v-data-table
        :headers="headers"
        :items="filtered"
        :search="search"
        :loading="loading"
        no-data-text="ไม่มีรายชื่อผู้รับการประเมิน"
        items-per-page-text="แถวต่อหน้า"
      >
        <template #item.name_th="{ item }">
          <div class="font-weight-medium">{{ item.name_th }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.department_name || '-' }}</div>
        </template>
        <template #item.files="{ item }">
          {{ item.indicators_with_files }} / {{ item.indicators_total }} ตัวชี้วัด
          <div class="text-caption text-medium-emphasis">{{ item.files_count }} ไฟล์</div>
        </template>
        <template #item.self_status="{ item }"><StatusChip :status="item.self_status" /></template>
        <template #item.my_status="{ item }">
          <StatusChip :status="item.my_status" />
          <div class="text-caption text-medium-emphasis">ให้คะแนนแล้ว {{ item.my_scored }} / {{ item.indicators_total }}</div>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex ga-1 justify-end">
            <v-btn
              :to="`/eval/score/${item.evaluatee_id}`"
              size="small"
              :color="item.my_status === 'submitted' ? undefined : 'primary'"
              :variant="item.my_status === 'submitted' ? 'tonal' : 'flat'"
              :prepend-icon="item.my_status === 'submitted' ? 'mdi-eye-outline' : 'mdi-lead-pencil'"
            >
              {{ item.my_status === 'submitted' ? 'ดูผล' : 'ให้คะแนน' }}
            </v-btn>
            <v-btn :to="`/report/${item.evaluatee_id}`" size="small" variant="text" icon="mdi-file-document-outline" title="รายงาน" />
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup>
definePageMeta({ roles: ['evaluator'] })

const { $api } = useNuxtApp()
const notify = useNotify()
const { selectedId, selected, load: loadPeriods } = usePeriods()

const headers = [
  { title: 'ครูผู้รับการประเมิน', key: 'name_th' },
  { title: 'หลักฐาน', key: 'files', sortable: false },
  { title: 'ประเมินตนเอง', key: 'self_status' },
  { title: 'การประเมินของฉัน', key: 'my_status' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]
const rows = ref([])
const loading = ref(false)
const search = ref('')
const filter = ref('all')
const filtered = computed(() =>
  rows.value.filter((r) => filter.value === 'all' || (filter.value === 'submitted' ? r.my_status === 'submitted' : r.my_status !== 'submitted'))
)

async function load() {
  loading.value = true
  try {
    await loadPeriods()
    if (!selectedId.value) return
    rows.value = (await $api.get('/api/assignments/mine', { params: { period_id: selectedId.value } })).data.data
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
