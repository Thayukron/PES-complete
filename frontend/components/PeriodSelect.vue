<template>
  <v-select
    :model-value="selectedId"
    :items="periods"
    item-value="id"
    :item-title="(p) => p.name_th + (p.is_active ? '' : ' (ปิดแล้ว)')"
    label="รอบการประเมิน"
    prepend-inner-icon="mdi-calendar"
    hide-details
    :loading="loading"
    style="min-width: 260px; max-width: 360px"
    @update:model-value="onChange"
  />
</template>

<script setup>
const emit = defineEmits(['change'])
const { periods, selectedId, loading, load, select } = usePeriods()
onMounted(() => load())
function onChange(id) {
  select(id)
  emit('change', id)
}
</script>
