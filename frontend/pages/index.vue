<template>
  <div>
    <PageHeader :title="`สวัสดี ${auth.user?.name || ''}`" :subtitle="roleLabel(auth.role)">
      <PeriodSelect @change="load" />
    </PageHeader>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <v-alert v-if="!loading && !d.period" type="info" variant="tonal" class="mb-4">
      ยังไม่มีรอบการประเมินที่เปิดใช้งาน
      <template v-if="auth.isAdmin"> — <NuxtLink to="/admin/periods">สร้างรอบการประเมิน</NuxtLink></template>
    </v-alert>

    <!-- ===== ผู้ดูแลระบบ ===== -->
    <template v-if="auth.isAdmin && !loading">
      <v-row>
        <v-col v-for="c in adminCards" :key="c.label" cols="12" sm="6" lg="3">
          <StatCard v-bind="c" />
        </v-col>
      </v-row>
      <v-row v-if="d.period">
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-title>ความคืบหน้ารอบนี้</v-card-title>
            <v-card-text>
              <ProgressRow label="ครูส่งแบบประเมินตนเอง" :value="d.self_submitted" :total="d.evaluatees" color="teal" />
              <ProgressRow label="กรรมการประเมินครบทุกท่าน" :value="d.completed" :total="d.evaluatees" color="success" />
            </v-card-text>
            <v-card-actions><v-btn to="/admin/monitor" color="primary" variant="tonal">ดูรายละเอียด</v-btn></v-card-actions>
          </v-card>
        </v-col>
        <v-col cols="12" md="6"><RecentFiles :items="d.recent" /></v-col>
      </v-row>
    </template>

    <!-- ===== กรรมการ ===== -->
    <template v-if="auth.isEvaluator && !loading && d.period">
      <v-row>
        <v-col cols="12" sm="4"><StatCard label="ผู้รับการประเมินทั้งหมด" :value="d.my?.total" icon="mdi-account-group-outline" color="primary" to="/eval/tasks" /></v-col>
        <v-col cols="12" sm="4"><StatCard label="ส่งผลแล้ว" :value="d.my?.submitted" icon="mdi-check-circle-outline" color="success" /></v-col>
        <v-col cols="12" sm="4"><StatCard label="ยังไม่ส่งผล" :value="(d.my?.total || 0) - (d.my?.submitted || 0)" icon="mdi-timer-sand" color="warning" /></v-col>
      </v-row>
      <v-row>
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-title>งานของฉัน</v-card-title>
            <v-card-text>
              <ProgressRow label="ประเมินเสร็จแล้ว" :value="d.my?.submitted" :total="d.my?.total" color="success" />
            </v-card-text>
            <v-card-actions>
              <v-btn to="/eval/tasks" color="primary" variant="flat" prepend-icon="mdi-clipboard-account-outline">ไปที่รายชื่อผู้รับการประเมิน</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
        <v-col cols="12" md="6"><RecentFiles :items="d.recent" /></v-col>
      </v-row>
    </template>

    <!-- ===== ครู ===== -->
    <template v-if="auth.isEvaluatee && !loading && d.period">
      <v-alert v-if="!d.me" type="warning" variant="tonal" class="mb-4">
        คุณยังไม่ได้รับการกำหนดกรรมการในรอบนี้ จึงยังอัปโหลดหลักฐานไม่ได้ กรุณาติดต่อผู้ดูแลระบบ
      </v-alert>
      <template v-else>
        <v-row>
          <v-col cols="12" sm="6" lg="3">
            <StatCard label="ตัวชี้วัดที่มีหลักฐาน" :value="`${d.me.indicators_with_files} / ${d.me.indicators_total}`" icon="mdi-file-check-outline" color="primary" to="/me/evidence" />
          </v-col>
          <v-col cols="12" sm="6" lg="3">
            <StatCard label="ไฟล์ที่อัปโหลด" :value="d.me.files_count" icon="mdi-paperclip" color="indigo" to="/me/evidence" />
          </v-col>
          <v-col cols="12" sm="6" lg="3">
            <StatCard label="ประเมินตนเอง" :value="STATUS[d.me.self_status].text" icon="mdi-star-check-outline" :color="STATUS[d.me.self_status].color" to="/me/self-assessment" />
          </v-col>
          <v-col cols="12" sm="6" lg="3">
            <StatCard label="กรรมการส่งผลแล้ว" :value="`${d.me.evaluators_submitted} / ${d.me.evaluators.length}`" icon="mdi-account-check-outline" color="success" to="/me/results" />
          </v-col>
        </v-row>
        <v-card class="mt-2">
          <v-card-title>ขั้นตอนการประเมิน</v-card-title>
          <v-card-text>
            <v-timeline side="end" density="compact" align="start">
              <v-timeline-item
                v-for="s in steps"
                :key="s.title"
                :dot-color="s.done ? 'success' : 'grey-lighten-1'"
                :icon="s.done ? 'mdi-check' : undefined"
                size="small"
              >
                <div class="d-flex flex-wrap align-center ga-2">
                  <strong>{{ s.title }}</strong>
                  <v-btn v-if="s.to" :to="s.to" size="small" variant="tonal" color="primary">{{ s.action }}</v-btn>
                </div>
                <div class="text-body-2 text-medium-emphasis">{{ s.detail }}</div>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>
      </template>
    </template>
  </div>
</template>

<script setup>
const auth = useAuthStore()
const { $api } = useNuxtApp()
const notify = useNotify()
const { selectedId, load: loadPeriods } = usePeriods()

const d = ref({})
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    await loadPeriods()
    const { data } = await $api.get('/api/dashboard', { params: { period_id: selectedId.value || undefined } })
    d.value = data.data
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const adminCards = computed(() => [
  { label: 'ครูผู้รับการประเมิน', value: d.value.users?.evaluatee || 0, icon: 'mdi-account-school-outline', color: 'teal', to: '/admin/users' },
  { label: 'กรรมการประเมิน', value: d.value.users?.evaluator || 0, icon: 'mdi-account-tie-outline', color: 'indigo', to: '/admin/users' },
  { label: 'ตัวชี้วัดที่ใช้งาน', value: d.value.indicators || 0, icon: 'mdi-format-list-checks', color: 'deep-purple', to: '/admin/topics' },
  { label: 'ไฟล์หลักฐานในรอบนี้', value: d.value.files || 0, icon: 'mdi-paperclip', color: 'primary', to: '/admin/monitor' },
])

const steps = computed(() => {
  const me = d.value.me
  if (!me) return []
  return [
    { title: '1. อัปโหลดหลักฐาน', detail: `มีหลักฐานแล้ว ${me.indicators_with_files} จาก ${me.indicators_total} ตัวชี้วัด`, done: me.indicators_with_files >= me.indicators_total, to: '/me/evidence', action: 'อัปโหลด' },
    { title: '2. ประเมินตนเอง', detail: STATUS[me.self_status].text, done: me.self_status === 'submitted', to: '/me/self-assessment', action: 'ประเมินตนเอง' },
    { title: '3. กรรมการประเมิน', detail: `ส่งผลแล้ว ${me.evaluators_submitted} จาก ${me.evaluators.length} ท่าน`, done: me.evaluators.length > 0 && me.evaluators_submitted === me.evaluators.length },
    { title: '4. ดูผลการประเมิน', detail: me.percent !== null ? `คะแนนรวม ${pct(me.percent)} (${me.level})` : 'รอผลจากกรรมการ', done: me.percent !== null, to: '/me/results', action: 'ดูผล' },
  ]
})
</script>
