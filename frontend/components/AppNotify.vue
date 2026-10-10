<template>
  <v-snackbar v-model="state.show" :color="state.color" :timeout="state.timeout" location="top right">
    {{ state.text }}
    <template #actions>
      <v-btn variant="text" icon="mdi-close" @click="state.show = false" />
    </template>
  </v-snackbar>
</template>

<script setup>
const { state } = useNotify()
</script>
