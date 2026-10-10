<!-- รายการไฟล์หลักฐาน: เปิดดู / ดาวน์โหลด / (ลบ) -->
<template>
  <div v-if="!files.length" class="text-medium-emphasis text-body-2">{{ emptyText }}</div>
  <v-list v-else density="compact" class="py-0 bg-transparent">
    <v-list-item v-for="f in files" :key="f.id" class="px-0">
      <template #prepend>
        <v-icon :icon="iconOf(f)" :color="f.mime_type === 'application/pdf' ? 'error' : 'primary'" />
      </template>
      <v-list-item-title class="text-body-2">{{ f.file_name }}</v-list-item-title>
      <v-list-item-subtitle class="text-caption">
        {{ fileSize(f.size_bytes) }} · {{ thDate(f.created_at, true) }}
        <span v-if="showIndicator && f.indicator_code"> · {{ f.indicator_code }} {{ f.indicator_name }}</span>
        <span v-if="f.note"> · {{ f.note }}</span>
      </v-list-item-subtitle>
      <template #append>
        <v-btn v-if="canPreview(f)" icon="mdi-eye-outline" variant="text" size="small" title="เปิดดู" @click="view(f)" />
        <v-btn icon="mdi-download" variant="text" size="small" title="ดาวน์โหลด" @click="download(f)" />
        <v-btn v-if="deletable" icon="mdi-delete-outline" variant="text" size="small" color="error" title="ลบ" @click="$emit('delete', f)" />
      </template>
    </v-list-item>
  </v-list>
</template>

<script setup>
defineProps({
  files: { type: Array, default: () => [] },
  deletable: { type: Boolean, default: false },
  showIndicator: { type: Boolean, default: false },
  emptyText: { type: String, default: 'ยังไม่มีไฟล์หลักฐาน' },
})
defineEmits(['delete'])
const { view, download, canPreview } = useAttachment()
const iconOf = (f) =>
  f.mime_type === 'application/pdf' ? 'mdi-file-pdf-box'
    : f.mime_type.startsWith('image/') ? 'mdi-file-image-outline'
      : f.mime_type.includes('zip') ? 'mdi-folder-zip-outline'
        : 'mdi-file-document-outline'
</script>
