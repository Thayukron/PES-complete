<template>
  <div>
    <PageHeader title="ประเมินตนเอง" :subtitle="selected?.name_th || ''">
      <PeriodSelect @change="load" />
      <StatusChip :status="status" label="สถานะ" />
    </PageHeader>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <template v-if="!loading">
      <v-alert v-if="status === 'submitted'" type="success" variant="tonal" density="compact" class="mb-4">
        ส่งแบบประเมินตนเองแล้ว — หากต้องการแก้ไขกรุณาติดต่อผู้ดูแลระบบ
      </v-alert>
      <v-alert v-else-if="selected && !selected.is_active" type="info" variant="tonal" density="compact" class="mb-4">รอบการประเมินนี้ปิดแล้ว</v-alert>
      <v-alert v-else type="info" variant="tonal" density="compact" class="mb-4">
        ประเมินตนเองให้ครบทุกตัวชี้วัด สามารถ "บันทึกร่าง" ไว้ก่อนได้ เมื่อพร้อมแล้วกด "ส่งแบบประเมินตนเอง"
      </v-alert>

      <v-card class="mb-4" variant="tonal" color="primary">
        <v-card-text class="d-flex flex-wrap align-center ga-4">
          <div>ประเมินแล้ว <strong>{{ scoredCount }} / {{ indicators.length }}</strong> ตัวชี้วัด</div>
          <v-progress-linear :model-value="(100 * scoredCount) / (indicators.length || 1)" height="8" rounded color="primary" style="max-width: 300px" />
        </v-card-text>
      </v-card>

      <v-card v-for="t in topics" :key="t.id" class="mb-4">
        <v-card-title class="d-flex align-center ga-2">
          <v-chip size="small" color="primary" variant="flat">{{ t.code }}</v-chip>{{ t.title_th }}
        </v-card-title>
        <v-divider />
        <div v-for="(i, idx) in t.indicators" :key="i.id">
          <v-divider v-if="idx" />
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="5">
                <div class="font-weight-bold">{{ i.code }} {{ i.name_th }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ i.description }}</div>
                <div class="text-caption mt-1">
                  <v-icon :icon="fileCount(i) ? 'mdi-paperclip-check' : 'mdi-paperclip-off'" :color="fileCount(i) ? 'success' : 'warning'" size="small" />
                  หลักฐาน {{ fileCount(i) }} ไฟล์
                  <NuxtLink v-if="!fileCount(i)" :to="{ path: '/me/evidence', query: { indicator: i.id } }">(อัปโหลด)</NuxtLink>
                </div>
              </v-col>
              <v-col cols="12" md="3">
                <ScoreInput v-model="values[i.id]" :indicator="i" :disabled="locked" />
              </v-col>
              <v-col cols="12" md="4">
                <v-textarea v-model="values[i.id].notes" label="คำอธิบายเพิ่มเติม (ไม่บังคับ)" rows="1" hide-details :disabled="locked" />
              </v-col>
            </v-row>
          </v-card-text>
        </div>
      </v-card>

      <div v-if="!locked" class="d-flex flex-wrap justify-end ga-2 pb-8">
        <v-btn variant="tonal" prepend-icon="mdi-content-save-outline" :loading="saving === 'draft'" @click="save(false)">บันทึกร่าง</v-btn>
        <v-btn color="success" variant="flat" prepend-icon="mdi-send-check" :loading="saving === 'submit'" @click="save(true)">ส่งแบบประเมินตนเอง</v-btn>
      </div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ roles: ['evaluatee'] })

const { $api } = useNuxtApp()
const notify = useNotify()
const confirm = useConfirm()
const { selectedId, selected, load: loadPeriods } = usePeriods()

const loading = ref(true)
const saving = ref(null)
const topics = ref([])
const files = ref([])
const status = ref('none')
const values = reactive({})

const indicators = computed(() => topics.value.flatMap((t) => t.indicators))
const locked = computed(() => status.value === 'submitted' || !selected.value?.is_active)
const hasValue = (i) => (i.type === 'score_1_4' ? values[i.id]?.score != null : values[i.id]?.value_yes_no != null)
const scoredCount = computed(() => indicators.value.filter(hasValue).length)
const fileCount = (i) => files.value.filter((f) => f.indicator_id === i.id).length

async function load() {
  loading.value = true
  try {
    await loadPeriods()
    const params = { period_id: selectedId.value }
    const [t, sa, att] = await Promise.all([
      $api.get('/api/topics'),
      $api.get('/api/self-assessments', { params }),
      $api.get('/api/attachments', { params }),
    ])
    topics.value = t.data.data
    files.value = att.data.data
    status.value = sa.data.status
    const byId = Object.fromEntries(sa.data.data.map((r) => [r.indicator_id, r]))
    for (const i of indicators.value) {
      const r = byId[i.id]
      values[i.id] = {
        score: r?.score == null ? null : Number(r.score),
        value_yes_no: r?.value_yes_no == null ? null : Number(r.value_yes_no),
        notes: r?.notes || '',
      }
    }
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function save(submit) {
  if (submit) {
    const missing = indicators.value.length - scoredCount.value
    if (missing > 0) return notify.error(`ยังประเมินไม่ครบอีก ${missing} ตัวชี้วัด`)
    const ok = await confirm({ title: 'ยืนยันส่งแบบประเมินตนเอง', text: 'เมื่อส่งแล้วจะแก้ไขไม่ได้ (ยกเว้นผู้ดูแลระบบเปิดให้แก้ไข)', okText: 'ส่ง', color: 'success' })
    if (!ok) return
  }
  saving.value = submit ? 'submit' : 'draft'
  try {
    const items = indicators.value.map((i) => ({ indicator_id: i.id, ...values[i.id] }))
    const { data } = await $api.put('/api/self-assessments', { period_id: selectedId.value, items, submit })
    status.value = data.status
    notify.success(data.message)
  } catch (e) {
    notify.apiError(e)
  } finally {
    saving.value = null
  }
}
</script>
