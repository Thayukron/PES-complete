<template>
  <div class="mb-4">
    <div class="d-flex justify-space-between text-body-2 mb-1">
      <span>{{ label }}</span><span>{{ value || 0 }} / {{ total || 0 }}</span>
    </div>
    <v-progress-linear :model-value="percent" :color="color" height="10" rounded />
  </div>
</template>

<script setup>
const props = defineProps({
  label: { type: String, default: '' },
  value: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  color: { type: String, default: 'primary' },
})
const percent = computed(() => (props.total ? (100 * (props.value || 0)) / props.total : 0))
</script>
