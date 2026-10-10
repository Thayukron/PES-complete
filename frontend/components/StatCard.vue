<template>
  <v-card :to="to" class="h-100">
    <v-card-text class="d-flex align-center ga-4">
      <v-avatar :color="color" variant="tonal" size="52" rounded="lg"><v-icon :icon="icon" size="28" /></v-avatar>
      <div>
        <div class="text-body-2 text-medium-emphasis">{{ label }}</div>
        <div class="text-h5 font-weight-bold">{{ value ?? '-' }}</div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  value: { type: [String, Number], default: null },
  icon: { type: String, default: 'mdi-information-outline' },
  color: { type: String, default: 'primary' },
  to: { type: String, default: undefined },
})
</script>
