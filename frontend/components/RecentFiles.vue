<template>
  <v-card class="h-100">
    <v-card-title>หลักฐานที่อัปโหลดล่าสุด</v-card-title>
    <v-card-text>
      <div v-if="!items?.length" class="text-medium-emphasis">ยังไม่มีการอัปโหลด</div>
      <v-list v-else density="compact" class="py-0">
        <v-list-item
          v-for="f in items"
          :key="f.id"
          prepend-icon="mdi-paperclip"
          class="px-0"
          :title="f.file_name"
          :subtitle="`${f.evaluatee_name} · ${f.indicator_code} · ${thDate(f.created_at, true)}`"
        />
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({ items: { type: Array, default: () => [] } })
</script>
