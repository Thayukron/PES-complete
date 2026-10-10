<template>
  <div>
    <PageHeader title="อัปโหลดหลักฐาน" subtitle="แนบไฟล์หลักฐานตามตัวชี้วัด (PDF, รูปภาพ, Word, Excel, PowerPoint, ZIP ไม่เกิน 10 MB)">
      <PeriodSelect @change="load" />
    </PageHeader>

    <v-alert v-if="selected && !selected.is_active" type="info" variant="tonal" density="compact" class="mb-4">
      รอบการประเมินนี้ปิดแล้ว ไม่สามารถอัปโหลดหรือลบหลักฐานได้
    </v-alert>

    <v-row>
      <v-col cols="12" lg="5">
        <v-card :disabled="!selected?.is_active">
          <v-card-title>แนบไฟล์ใหม่</v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="upload">
              <v-autocomplete
                v-model="form.indicator_id"
                :items="indicators"
                item-value="id"
                :item-title="(i) => `${i.code} ${i.name_th}`"
                label="ตัวชี้วัด *"
                :rules="[(v) => !!v || 'กรุณาเลือกตัวชี้วัด']"
                class="mb-2"
              />
              <v-select
                v-model="form.evidence_type_id"
                :items="evidenceTypes"
                item-value="id"
                item-title="name_th"
                label="ชนิดหลักฐาน *"
                :disabled="!form.indicator_id"
                :rules="[(v) => !!v || 'กรุณาเลือกชนิดหลักฐาน']"
                class="mb-2"
              />
              <v-file-input
                v-model="form.file"
                label="เลือกไฟล์ *"
                prepend-icon=""
                prepend-inner-icon="mdi-paperclip"
                :accept="ACCEPT"
                show-size
                :rules="[fileRule]"
                class="mb-2"
              />
              <v-text-field v-model="form.note" label="หมายเหตุ / คำอธิบายไฟล์ (ไม่บังคับ)" counter="255" maxlength="255" class="mb-2" />
              <v-progress-linear v-if="uploading" :model-value="progress" height="8" rounded color="primary" class="mb-3" />
              <v-btn type="submit" color="primary" block prepend-icon="mdi-cloud-upload-outline" :loading="uploading">อัปโหลด</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="7">
        <v-card>
          <v-card-title class="d-flex align-center">
            ไฟล์ของฉัน ({{ files.length }})
            <v-spacer />
            <v-chip size="small" variant="tonal" color="primary">มีหลักฐาน {{ coveredCount }} / {{ indicators.length }} ตัวชี้วัด</v-chip>
          </v-card-title>
          <v-card-text>
            <v-progress-linear v-if="loading" indeterminate color="primary" />
            <v-expansion-panels v-else variant="accordion" multiple>
              <v-expansion-panel v-for="i in indicators" :key="i.id">
                <v-expansion-panel-title>
                  <v-icon :icon="filesOf(i).length ? 'mdi-check-circle' : 'mdi-circle-outline'" :color="filesOf(i).length ? 'success' : 'grey'" class="mr-2" size="small" />
                  <span class="text-body-2"><strong>{{ i.code }}</strong> {{ i.name_th }}</span>
                  <v-spacer />
                  <v-chip size="x-small" class="mr-2">{{ filesOf(i).length }} ไฟล์</v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <FileList :files="filesOf(i)" :deletable="!!selected?.is_active" @delete="remove" />
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
definePageMeta({ roles: ['evaluatee'] })

const route = useRoute()
const { $api } = useNuxtApp()
const notify = useNotify()
const confirm = useConfirm()
const { selectedId, selected, load: loadPeriods } = usePeriods()

const MAX_MB = 10
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip'
const fileRule = (v) => {
  const f = Array.isArray(v) ? v[0] : v
  if (!f) return 'กรุณาเลือกไฟล์'
  if (f.size > MAX_MB * 1024 * 1024) return `ไฟล์ต้องไม่เกิน ${MAX_MB} MB`
  return true
}

const topics = ref([])
const files = ref([])
const loading = ref(false)
const indicators = computed(() => topics.value.flatMap((t) => t.indicators))
const filesOf = (i) => files.value.filter((f) => f.indicator_id === i.id)
const coveredCount = computed(() => indicators.value.filter((i) => filesOf(i).length).length)

const formRef = ref()
const form = reactive({ indicator_id: null, evidence_type_id: null, file: null, note: '' })
const evidenceTypes = computed(() => indicators.value.find((i) => i.id === form.indicator_id)?.evidence_types || [])
watch(() => form.indicator_id, () => {
  // เลือกชนิดหลักฐานให้อัตโนมัติถ้ามีให้เลือกแบบเดียว
  form.evidence_type_id = evidenceTypes.value.length === 1 ? evidenceTypes.value[0].id : null
})

async function loadFiles() {
  files.value = (await $api.get('/api/attachments', { params: { period_id: selectedId.value } })).data.data
}

async function load() {
  loading.value = true
  try {
    await loadPeriods()
    topics.value = (await $api.get('/api/topics')).data.data
    await loadFiles()
    if (route.query.indicator) form.indicator_id = Number(route.query.indicator)
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const uploading = ref(false)
const progress = ref(0)
async function upload() {
  if (!(await formRef.value.validate()).valid) return
  const file = Array.isArray(form.file) ? form.file[0] : form.file
  const fd = new FormData()
  fd.append('period_id', selectedId.value)
  fd.append('indicator_id', form.indicator_id)
  fd.append('evidence_type_id', form.evidence_type_id)
  fd.append('note', form.note || '')
  fd.append('file', file)

  uploading.value = true
  progress.value = 0
  try {
    await $api.post('/api/attachments', fd, { onUploadProgress: (e) => { progress.value = e.total ? (100 * e.loaded) / e.total : 0 } })
    notify.success(`อัปโหลด "${file.name}" เรียบร้อย`)
    form.file = null
    form.note = ''
    formRef.value.resetValidation()
    await loadFiles()
  } catch (e) {
    notify.apiError(e, 'อัปโหลดไม่สำเร็จ')
  } finally {
    uploading.value = false
  }
}

async function remove(f) {
  if (!(await confirm({ title: 'ลบไฟล์หลักฐาน', text: `ต้องการลบ "${f.file_name}" ใช่หรือไม่?`, okText: 'ลบ', color: 'error' }))) return
  try {
    await $api.delete(`/api/attachments/${f.id}`)
    notify.success('ลบไฟล์เรียบร้อย')
    await loadFiles()
  } catch (e) {
    notify.apiError(e)
  }
}
</script>
