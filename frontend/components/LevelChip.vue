<template>
  <span v-if="percent === null || percent === undefined" class="text-medium-emphasis">-</span>
  <v-chip v-else :color="levelColor(level)" size="small" variant="flat">
    {{ pct(percent) }} · {{ level }}
  </v-chip>
</template>

<script setup>
defineProps({ percent: { type: Number, default: null }, level: { type: String, default: null } })
</script>
