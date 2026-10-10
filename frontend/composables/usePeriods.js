// รอบการประเมิน + รอบที่เลือกอยู่ (จำไว้ใน localStorage ใช้ร่วมกันทุกหน้า)
export function usePeriods() {
  const { $api } = useNuxtApp()
  const periods = useState('periods', () => [])
  const selectedId = useState('periodId', () => {
    try { return Number(localStorage.getItem('pes_period')) || null } catch { return null }
  })
  const loading = useState('periodsLoading', () => false)

  const selected = computed(() => periods.value.find((p) => p.id === selectedId.value) || null)

  async function load(force = false) {
    if (periods.value.length && !force) return periods.value
    loading.value = true
    try {
      const { data } = await $api.get('/api/periods')
      periods.value = data.data
      if (!periods.value.some((p) => p.id === selectedId.value)) {
        // ค่าเริ่มต้น: รอบที่เปิดอยู่ล่าสุด
        selectedId.value = (periods.value.find((p) => p.is_active) || periods.value[0])?.id || null
      }
    } finally {
      loading.value = false
    }
    return periods.value
  }

  function select(id) {
    selectedId.value = id
    try { localStorage.setItem('pes_period', String(id)) } catch {}
  }

  return { periods, selectedId, selected, loading, load, select }
}
