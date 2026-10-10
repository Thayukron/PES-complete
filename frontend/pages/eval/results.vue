<template>
  <div>
    <PageHeader title="สรุปผลการประเมิน" :subtitle="`ครูที่คุณรับผิดชอบ · ${selected?.name_th || ''}`">
      <PeriodSelect class="no-print" @change="load" />
    </PageHeader>
    <SummaryReport :rows="rows" :loading="loading" :period-name="selected?.code" />
  </div>
</template>

<script setup>
definePageMeta({ roles: ['evaluator'] })

const { $api } = useNuxtApp()
const notify = useNotify()
const { selectedId, selected, load: loadPeriods } = usePeriods()
const rows = ref([])
const loading = ref(false)

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
onMounted(load)
</script>
