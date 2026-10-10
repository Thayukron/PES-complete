<template>
  <div>
    <PageHeader :title="`ให้คะแนน: ${person?.name_th || ''}`" :subtitle="`${person?.department_name || ''} · ${period?.name_th || ''}`">
      <v-btn to="/eval/tasks" variant="text" prepend-icon="mdi-arrow-left">กลับ</v-btn>
      <StatusChip :status="status" label="สถานะ" />
    </PageHeader>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <template v-if="!loading && person">
      <v-alert v-if="status === 'submitted'" type="success" variant="tonal" density="compact" class="mb-4">
        ส่งผลการประเมินแล้ว — หากต้องการแก้ไขกรุณาติดต่อผู้ดูแลระบบ
      </v-alert>
      <v-alert v-else-if="!period?.is_active" type="info" variant="tonal" density="compact" class="mb-4">รอบการประเมินนี้ปิดแล้ว ไม่สามารถแก้ไขได้</v-alert>

      <v-card class="mb-4" variant="tonal" color="primary">
        <v-card-text class="d-flex flex-wrap align-center ga-4">
          <div>ให้คะแนนแล้ว <strong>{{ scoredCount }} / {{ indicatorCount }}</strong> ตัวชี้วัด</div>
          <v-progress-linear :model-value="(100 * scoredCount) / (indicatorCount || 1)" height="8" rounded color="primary" style="max-width: 300px" />
          <v-spacer />
          <div>การประเมินตนเองของครู: <StatusChip :status="selfStatus" /></div>
        </v-card-text>
      </v-card>

      <v-card v-for="t in topics" :key="t.id" class="mb-4">
        <v-card-title class="d-flex align-center ga-2">
          <v-chip size="small" color="primary" variant="flat">{{ t.code }}</v-chip>
          {{ t.title_th }}
          <v-chip size="small" variant="tonal">น้ำหนัก {{ Number(t.weight).toFixed(2) }}</v-chip>
        </v-card-title>
        <v-divider />
        <div v-for="(i, idx) in t.indicators" :key="i.id">
          <v-divider v-if="idx" />
          <v-card-text>
            <v-row>
              <v-col cols="12" md="5">
                <div class="font-weight-bold">{{ i.code }} {{ i.name_th }}</div>
                <div class="text-body-2 text-medium-emphasis mb-2">{{ i.description }}</div>
                <div class="text-caption text-medium-emphasis mb-1">หลักฐานที่ครูส่ง ({{ filesOf(i).length }})</div>
                <FileList :files="filesOf(i)" empty-text="ครูยังไม่ได้ส่งหลักฐาน" />
              </v-col>
              <v-col cols="12" md="2">
                <div class="text-caption text-medium-emphasis">ครูประเมินตนเอง</div>
                <div class="text-h6">{{ valueText(i, self[i.id]) }}</div>
                <div v-if="self[i.id]?.notes" class="text-caption text-pre">{{ self[i.id].notes }}</div>
              </v-col>
              <v-col cols="12" md="5">
                <div class="text-caption text-medium-emphasis mb-1">
                  คะแนนของกรรมการ ({{ INDICATOR_TYPES[i.type] }}<span v-if="i.type === 'score_1_4'"> {{ i.min_score }}-{{ i.max_score }}</span>)
                </div>
                <ScoreInput v-model="values[i.id]" :indicator="i" :disabled="locked" class="mb-2" />
                <v-textarea v-model="values[i.id].notes" label="ความเห็น/ข้อเสนอแนะ (ไม่บังคับ)" rows="1" :disabled="locked" hide-details />
              </v-col>
            </v-row>
          </v-card-text>
        </div>
      </v-card>

      <v-card class="mb-4">
        <v-card-title>ข้อเสนอแนะภาพรวมถึงครู</v-card-title>
        <v-card-text>
          <v-textarea v-model="comment" label="จุดเด่น / สิ่งที่ควรพัฒนา" rows="3" :disabled="locked" hide-details />
        </v-card-text>
      </v-card>

      <div v-if="!locked" class="d-flex flex-wrap justify-end ga-2 pb-8">
        <v-btn variant="tonal" prepend-icon="mdi-content-save-outline" :loading="saving === 'draft'" @click="save(false)">บันทึกร่าง</v-btn>
        <v-btn color="success" variant="flat" prepend-icon="mdi-send-check" :loading="saving === 'submit'" @click="save(true)">ส่งผลการประเมิน</v-btn>
      </div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ roles: ['evaluator'], title: 'ให้คะแนน' })

const route = useRoute()
const { $api } = useNuxtApp()
const notify = useNotify()
const confirm = useConfirm()
const { selectedId, load: loadPeriods } = usePeriods()
const evaluateeId = Number(route.params.id)

const loading = ref(true)
const saving = ref(null)
const period = ref(null)
const person = ref(null)
const topics = ref([])
const files = ref([])
const self = ref({})
const selfStatus = ref('none')
const status = ref('none')
const values = reactive({})
const comment = ref('')

const locked = computed(() => status.value === 'submitted' || !period.value?.is_active)
const indicators = computed(() => topics.value.flatMap((t) => t.indicators))
const indicatorCount = computed(() => indicators.value.length)
const hasValue = (i) => (i.type === 'score_1_4' ? values[i.id]?.score != null : values[i.id]?.value_yes_no != null)
const scoredCount = computed(() => indicators.value.filter(hasValue).length)
const filesOf = (i) => files.value.filter((f) => f.indicator_id === i.id)

const normalize = (r) => ({
  score: r?.score === null || r?.score === undefined ? null : Number(r.score),
  value_yes_no: r?.value_yes_no === null || r?.value_yes_no === undefined ? null : Number(r.value_yes_no),
  notes: r?.notes || '',
})

async function load() {
  loading.value = true
  try {
    await loadPeriods()
    const params = { period_id: selectedId.value, evaluatee_id: evaluateeId }
    const [mine, tp, att, sa, res] = await Promise.all([
      $api.get('/api/assignments/mine', { params: { period_id: selectedId.value } }),
      $api.get('/api/topics'),
      $api.get('/api/attachments', { params }),
      $api.get('/api/self-assessments', { params }),
      $api.get('/api/results', { params }),
    ])
    person.value = mine.data.data.find((r) => r.evaluatee_id === evaluateeId) || null
    if (!person.value) {
      notify.error('ไม่ได้รับมอบหมายให้ประเมินบุคลากรท่านนี้')
      return navigateTo('/eval/tasks')
    }
    period.value = res.data.period
    topics.value = tp.data.data
    files.value = att.data.data
    self.value = Object.fromEntries(sa.data.data.map((r) => [r.indicator_id, normalize(r)]))
    selfStatus.value = sa.data.status
    status.value = res.data.status
    comment.value = res.data.comment || ''
    const mineById = Object.fromEntries(res.data.data.map((r) => [r.indicator_id, r]))
    for (const i of indicators.value) values[i.id] = normalize(mineById[i.id])
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function save(submit) {
  if (submit) {
    const missing = indicatorCount.value - scoredCount.value
    if (missing > 0) return notify.error(`ยังให้คะแนนไม่ครบอีก ${missing} ตัวชี้วัด`)
    const ok = await confirm({
      title: 'ยืนยันส่งผลการประเมิน',
      text: `ส่งผลการประเมินของ ${person.value.name_th}\nเมื่อส่งแล้วจะแก้ไขไม่ได้ (ยกเว้นผู้ดูแลระบบเปิดให้แก้ไข)`,
      okText: 'ส่งผล',
      color: 'success',
    })
    if (!ok) return
  }
  saving.value = submit ? 'submit' : 'draft'
  try {
    const items = indicators.value.map((i) => ({ indicator_id: i.id, ...values[i.id] }))
    const { data } = await $api.put('/api/results', { period_id: period.value.id, evaluatee_id: evaluateeId, items, comment: comment.value, submit })
    status.value = data.status
    notify.success(data.message)
  } catch (e) {
    notify.apiError(e)
  } finally {
    saving.value = null
  }
}
</script>
