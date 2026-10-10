<!-- ช่องให้คะแนน 1 ตัวชี้วัด: แบบระดับคะแนน หรือ มี/ไม่มี -->
<template>
  <div>
    <!-- โหมดอ่านอย่างเดียว: แสดงค่าที่เลือกให้ชัดเจน -->
    <v-chip v-if="disabled" :color="chipColor" variant="tonal" size="large" label>
      {{ valueText(indicator, modelValue) === '-' ? 'ไม่ได้ระบุ' : valueText(indicator, modelValue) }}
    </v-chip>
    <v-btn-toggle
      v-else-if="indicator.type === 'score_1_4'"
      :model-value="modelValue.score"
      color="primary"
      variant="outlined"
      density="comfortable"
      divided
      :disabled="disabled"
      @update:model-value="(v) => emit('update:modelValue', { ...modelValue, score: v ?? null })"
    >
      <v-btn v-for="s in scores" :key="s" :value="s" min-width="48">{{ s }}</v-btn>
    </v-btn-toggle>
    <v-btn-toggle
      v-else
      :model-value="modelValue.value_yes_no"
      variant="outlined"
      density="comfortable"
      divided
      :disabled="disabled"
      @update:model-value="(v) => emit('update:modelValue', { ...modelValue, value_yes_no: v ?? null })"
    >
      <v-btn :value="1" color="success" prepend-icon="mdi-check">มี</v-btn>
      <v-btn :value="0" color="error" prepend-icon="mdi-close">ไม่มี</v-btn>
    </v-btn-toggle>
  </div>
</template>

<script setup>
const props = defineProps({
  indicator: { type: Object, required: true },
  modelValue: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const chipColor = computed(() => {
  const v = props.modelValue
  if (props.indicator.type === 'score_1_4') return v.score == null ? 'grey' : 'primary'
  return v.value_yes_no == null ? 'grey' : Number(v.value_yes_no) ? 'success' : 'error'
})
const scores = computed(() => {
  const out = []
  for (let s = Number(props.indicator.min_score); s <= Number(props.indicator.max_score); s++) out.push(s)
  return out
})
</script>
