<template>
  <div>
    <PageHeader title="ตัวชี้วัด" subtitle="ด้านการประเมิน ตัวชี้วัด และชนิดหลักฐานที่ต้องส่ง">
      <PeriodSelect @change="load" />
    </PageHeader>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <v-card v-for="t in topics" :key="t.id" class="mb-4">
      <v-card-title class="d-flex flex-wrap align-center ga-2">
        <v-chip size="small" color="primary" variant="flat">{{ t.code }}</v-chip>
        {{ t.title_th }}
        <v-chip size="small" variant="tonal">น้ำหนัก {{ (Number(t.weight) * 100).toFixed(0) }}%</v-chip>
      </v-card-title>
      <v-card-subtitle v-if="t.description" class="text-wrap">{{ t.description }}</v-card-subtitle>
      <v-table density="comfortable" class="mt-2">
        <thead>
          <tr><th>รหัส</th><th>ตัวชี้วัด</th><th>การให้คะแนน</th><th>ชนิดหลักฐาน</th><th class="text-center">ไฟล์ของฉัน</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="i in t.indicators" :key="i.id">
            <td class="text-no-wrap">{{ i.code }}</td>
            <td>
              <div class="font-weight-medium">{{ i.name_th }}</div>
              <div class="text-caption text-medium-emphasis">{{ i.description }}</div>
            </td>
            <td class="text-no-wrap">{{ INDICATOR_TYPES[i.type] }}<span v-if="i.type === 'score_1_4'"> ({{ i.min_score }}-{{ i.max_score }})</span></td>
            <td><v-chip v-for="e in i.evidence_types" :key="e.id" size="x-small" variant="outlined" class="mr-1 mb-1">{{ e.name_th }}</v-chip></td>
            <td class="text-center">
              <v-chip :color="countOf(i) ? 'success' : 'grey'" size="small" variant="tonal">{{ countOf(i) }}</v-chip>
            </td>
            <td class="text-end">
              <v-btn :to="{ path: '/me/evidence', query: { indicator: i.id } }" size="small" variant="tonal" color="primary" prepend-icon="mdi-upload">อัปโหลด</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<script setup>
definePageMeta({ roles: ['evaluatee'] })

const { $api } = useNuxtApp()
const notify = useNotify()
const { selectedId, load: loadPeriods } = usePeriods()

const topics = ref([])
const files = ref([])
const loading = ref(false)
const countOf = (i) => files.value.filter((f) => f.indicator_id === i.id).length

async function load() {
  loading.value = true
  try {
    await loadPeriods()
    const [t, a] = await Promise.all([
      $api.get('/api/topics'),
      $api.get('/api/attachments', { params: { period_id: selectedId.value } }),
    ])
    topics.value = t.data.data
    files.value = a.data.data
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
