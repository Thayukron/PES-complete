<template>
  <div>
    <PageHeader title="รายงานผลการประเมิน" :subtitle="selected?.name_th || ''">
      <v-select v-model="dept" :items="departments" item-title="name_th" item-value="id" label="แผนกวิชา" clearable hide-details style="max-width: 260px" class="no-print" />
      <PeriodSelect class="no-print" @change="load" />
    </PageHeader>
    <SummaryReport :rows="rows" :loading="loading" :period-name="selected?.code" />
  </div>
</template>

<script setup>
definePageMeta({ roles: ['admin'] })

const { $api } = useNuxtApp()
const notify = useNotify()
const { selectedId, selected, load: loadPeriods } = usePeriods()

const rows = ref([])
const departments = ref([])
const dept = ref(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    await loadPeriods()
    if (!selectedId.value) return
    const { data } = await $api.get('/api/reports/summary', { params: { period_id: selectedId.value, department_id: dept.value || undefined } })
    rows.value = data.data
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}
watch(dept, load)
onMounted(async () => {
  load()
  try { departments.value = (await $api.get('/api/lookups')).data.data.departments } catch {}
})
</script>
