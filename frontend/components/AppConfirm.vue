<template>
  <v-dialog v-model="state.show" max-width="440" persistent>
    <v-card>
      <v-card-title class="text-h6">{{ state.title }}</v-card-title>
      <v-card-text class="text-pre">{{ state.text }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="answer(false)">ยกเลิก</v-btn>
        <v-btn :color="state.color" variant="flat" @click="answer(true)">{{ state.okText }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
const state = useConfirmState()
function answer(ok) {
  state.value.show = false
  state.value.resolve?.(ok)
}
</script>
