<template>
  <v-chip :color="info.color" size="small" variant="tonal" :prepend-icon="info.icon">
    {{ label ? `${label}: ${info.text}` : info.text }}
  </v-chip>
</template>

<script setup>
const props = defineProps({ status: { type: String, default: 'none' }, label: { type: String, default: '' } })
const info = computed(() => STATUS[props.status] || STATUS.none)
</script>
