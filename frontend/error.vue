<template>
  <v-app>
    <v-main class="d-flex align-center justify-center" style="min-height: 100vh">
      <div class="text-center pa-6">
        <div class="text-h2 font-weight-bold text-primary">{{ error?.statusCode || 'Error' }}</div>
        <div class="text-h6 my-3">{{ error?.statusCode === 404 ? 'ไม่พบหน้าที่ต้องการ' : 'เกิดข้อผิดพลาด' }}</div>
        <v-btn color="primary" prepend-icon="mdi-home" @click="clearError({ redirect: '/' })">กลับหน้าหลัก</v-btn>
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
defineProps({ error: { type: Object, default: null } })
</script>
