// โหลดรายงานรายบุคคลของครู (ใช้ในหน้าความคืบหน้า/ผลการประเมิน/พิมพ์รายงาน)
export function useEvaluateeReport(getId) {
  const { $api } = useNuxtApp()
  const notify = useNotify()
  const { selectedId, load: loadPeriods } = usePeriods()
  const r = ref(null)
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      await loadPeriods()
      const id = typeof getId === 'function' ? getId() : getId
      const { data } = await $api.get(`/api/reports/evaluatee/${id}`, { params: { period_id: selectedId.value || undefined } })
      r.value = data.data
    } catch (e) {
      r.value = null
      notify.apiError(e)
    } finally {
      loading.value = false
    }
  }
  return { r, loading, load }
}
