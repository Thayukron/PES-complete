<!-- ตารางสรุปผลการประเมินรายบุคคล (ใช้ทั้งหน้า admin และกรรมการ) พร้อมส่งออก CSV -->
<template>
  <div>
    <v-row class="mb-2">
      <v-col cols="6" md="3"><StatCard label="ประเมินเสร็จสมบูรณ์" :value="`${done.length} / ${rows.length}`" icon="mdi-check-decagram-outline" color="success" /></v-col>
      <v-col cols="6" md="3"><StatCard label="คะแนนเฉลี่ย" :value="avg === null ? '-' : pct(avg)" icon="mdi-chart-line" color="primary" /></v-col>
      <v-col cols="12" md="6">
        <v-card class="h-100">
          <v-card-text>
            <div class="text-body-2 text-medium-emphasis mb-2">จำนวนตามระดับผลการประเมิน</div>
            <div class="d-flex flex-wrap ga-2">
              <v-chip v-for="lv in levels" :key="lv" :color="levelColor(lv)" variant="tonal">
                {{ lv }}: <strong class="ml-1">{{ done.filter((r) => r.level === lv).length }}</strong>
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card>
      <v-card-text class="pb-0">
        <v-row dense>
          <v-col cols="12" md="5"><v-text-field v-model="search" label="ค้นหาชื่อครู/แผนก" prepend-inner-icon="mdi-magnify" clearable hide-details /></v-col>
          <v-col cols="12" md="7" class="d-flex justify-md-end align-center ga-2">
            <v-btn variant="tonal" prepend-icon="mdi-file-delimited-outline" :disabled="!rows.length" @click="exportCsv">ส่งออก CSV (Excel)</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-printer-outline" class="no-print" @click="print">พิมพ์</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
      <v-data-table
        :headers="headers"
        :items="rows"
        :search="search"
        :loading="loading"
        :items-per-page="-1"
        no-data-text="ยังไม่มีข้อมูล"
        hide-default-footer
      >
        <template #item.no="{ index }">{{ index + 1 }}</template>
        <template #item.name_th="{ item }">
          <div class="font-weight-medium">{{ item.name_th }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.department_name || '-' }}</div>
        </template>
        <template #item.evaluators="{ item }">{{ item.evaluators_submitted }} / {{ item.evaluators.length }}</template>
        <template #item.percent="{ item }">
          <span v-if="item.percent === null" class="text-medium-emphasis">รอผล</span>
          <strong v-else>{{ pct(item.percent) }}</strong>
        </template>
        <template #item.level="{ item }">
          <v-chip v-if="item.level" :color="levelColor(item.level)" size="small" variant="flat">{{ item.level }}</v-chip>
          <span v-else>-</span>
        </template>
        <template #item.pa_percent="{ item }">
          <span v-if="item.pa_percent === null" class="text-medium-emphasis">-</span>
          <span v-else>
            {{ pct(item.pa_percent).replace('%', '') }}
            <v-chip :color="item.pa_pass ? 'success' : 'error'" size="x-small" variant="tonal" class="ml-1">{{ item.pa_pass ? 'ผ่าน' : 'ไม่ผ่าน' }}</v-chip>
          </span>
        </template>
        <template #item.actions="{ item }">
          <v-btn :to="`/report/${item.evaluatee_id}`" size="small" variant="text" color="primary" prepend-icon="mdi-file-document-outline" class="no-print">รายงาน</v-btn>
        </template>
      </v-data-table>
    </v-card>
    <div class="text-caption text-medium-emphasis mt-2">
      * คะแนนคิดจากผลที่กรรมการ "ส่งแล้ว" เท่านั้น (หากมีกรรมการหลายท่านใช้ค่าเฉลี่ย) · เกณฑ์: ≥90 ดีเด่น, ≥80 ดีมาก, ≥70 ดี, ≥60 พอใช้, &lt;60 ปรับปรุง
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  periodName: { type: String, default: '' },
})

const levels = ['ดีเด่น', 'ดีมาก', 'ดี', 'พอใช้', 'ปรับปรุง']
const search = ref('')
const headers = [
  { title: 'ที่', key: 'no', sortable: false, width: 50 },
  { title: 'ครูผู้รับการประเมิน', key: 'name_th' },
  { title: 'หลักฐาน (ตัวชี้วัด)', key: 'indicators_with_files', value: (r) => `${r.indicators_with_files}/${r.indicators_total}` },
  { title: 'กรรมการส่งผล', key: 'evaluators', sortable: false },
  { title: 'คะแนนเลื่อนเงินเดือน (100)', key: 'percent' },
  { title: 'ระดับ', key: 'level' },
  { title: 'PA (100)', key: 'pa_percent' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const done = computed(() => props.rows.filter((r) => r.percent !== null))
const avg = computed(() => (done.value.length ? done.value.reduce((s, r) => s + r.percent, 0) / done.value.length : null))

function exportCsv() {
  const head = ['ที่', 'ชื่อ-นามสกุล', 'อีเมล', 'แผนกวิชา', 'ตัวชี้วัดที่มีหลักฐาน', 'ตัวชี้วัดทั้งหมด', 'ประเมินตนเอง', 'กรรมการส่งผล', 'กรรมการทั้งหมด', 'คะแนนเลื่อนเงินเดือน (100)', 'ระดับ', 'คะแนน PA (100)', 'ผล PA']
  const data = props.rows.map((r, i) => [
    i + 1, r.name_th, r.email, r.department_name || '', r.indicators_with_files, r.indicators_total,
    STATUS[r.self_status].text, r.evaluators_submitted, r.evaluators.length, r.percent ?? '', r.level ?? '', r.pa_percent ?? '', r.pa_pass === null || r.pa_pass === undefined ? '' : r.pa_pass ? 'ผ่าน' : 'ไม่ผ่าน',
  ])
  downloadCsv(`สรุปผลการประเมิน_${props.periodName || 'รอบ'}.csv`, head, data)
}
const print = () => window.print()
</script>
