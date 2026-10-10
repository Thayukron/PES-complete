<template>
  <div>
    <PageHeader title="ด้านและตัวชี้วัด" subtitle="กำหนดด้านการประเมิน น้ำหนัก ตัวชี้วัด และชนิดหลักฐานที่ใช้">
      <v-switch v-model="showInactive" label="แสดงรายการที่ปิดใช้งาน" color="primary" hide-details inset density="compact" />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openTopic()">เพิ่มด้าน</v-btn>
    </PageHeader>

    <v-alert v-if="weightSum !== 1 && topics.length" type="warning" variant="tonal" density="compact" class="mb-4">
      น้ำหนักรวมของด้านที่เปิดใช้งาน = {{ weightSum }} (แนะนำให้รวมได้ 1.00 เช่น 0.30 + 0.20 + 0.30 + 0.20) — ระบบจะคำนวณเป็นสัดส่วนให้อัตโนมัติ
    </v-alert>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-2" />

    <v-expansion-panels v-model="open" multiple variant="accordion">
      <v-expansion-panel v-for="t in visibleTopics" :key="t.id" :value="t.id">
        <v-expansion-panel-title>
          <div class="d-flex flex-wrap align-center ga-2 w-100">
            <v-chip size="small" color="primary" variant="flat">{{ t.code }}</v-chip>
            <strong>{{ t.title_th }}</strong>
            <v-chip size="small" variant="tonal">น้ำหนัก {{ Number(t.weight).toFixed(2) }}</v-chip>
            <v-chip size="small" variant="tonal">{{ t.indicators.length }} ตัวชี้วัด</v-chip>
            <v-chip v-if="!t.active" size="small" color="grey">ปิดใช้งาน</v-chip>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div v-if="t.description" class="text-body-2 text-medium-emphasis mb-2">{{ t.description }}</div>
          <div class="d-flex flex-wrap ga-2 mb-3">
            <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-plus" @click="openIndicator(null, t)">เพิ่มตัวชี้วัด</v-btn>
            <v-btn size="small" variant="tonal" prepend-icon="mdi-pencil" @click="openTopic(t)">แก้ไขด้าน</v-btn>
            <v-btn size="small" variant="tonal" color="error" prepend-icon="mdi-delete-outline" @click="removeTopic(t)">ลบด้าน</v-btn>
          </div>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>รหัส</th><th>ตัวชี้วัด</th><th>รูปแบบการให้คะแนน</th><th>น้ำหนัก</th><th>ชนิดหลักฐาน</th><th>สถานะ</th><th class="text-end">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!visibleIndicators(t).length"><td colspan="7" class="text-medium-emphasis">ยังไม่มีตัวชี้วัด</td></tr>
              <tr v-for="i in visibleIndicators(t)" :key="i.id">
                <td class="text-no-wrap">{{ i.code }}</td>
                <td>
                  <div class="font-weight-medium">{{ i.name_th }}</div>
                  <div class="text-caption text-medium-emphasis">{{ i.description }}</div>
                </td>
                <td class="text-no-wrap">{{ INDICATOR_TYPES[i.type] }}<span v-if="i.type === 'score_1_4'"> ({{ i.min_score }}-{{ i.max_score }})</span></td>
                <td>{{ Number(i.weight).toFixed(2) }}</td>
                <td>
                  <v-chip v-for="e in i.evidence_types" :key="e.id" size="x-small" class="mr-1 mb-1" variant="outlined">{{ e.name_th }}</v-chip>
                  <span v-if="!i.evidence_types.length" class="text-error text-caption">ยังไม่กำหนด</span>
                </td>
                <td><v-chip size="x-small" :color="i.active ? 'success' : 'grey'" variant="tonal">{{ i.active ? 'ใช้งาน' : 'ปิด' }}</v-chip></td>
                <td class="text-end text-no-wrap">
                  <v-btn icon="mdi-pencil" variant="text" size="small" @click="openIndicator(i, t)" />
                  <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="removeIndicator(i)" />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- ฟอร์มด้าน -->
    <v-dialog v-model="topicDialog" max-width="560" persistent>
      <v-card>
        <v-card-title>{{ topicForm.id ? 'แก้ไขด้านการประเมิน' : 'เพิ่มด้านการประเมิน' }}</v-card-title>
        <v-card-text>
          <v-form ref="topicRef">
            <v-row dense>
              <v-col cols="12" sm="4"><v-text-field v-model="topicForm.code" label="รหัส *" :rules="[req]" /></v-col>
              <v-col cols="12" sm="8"><v-text-field v-model="topicForm.title_th" label="ชื่อด้าน *" :rules="[req]" /></v-col>
              <v-col cols="12"><v-textarea v-model="topicForm.description" label="คำอธิบาย" /></v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model.number="topicForm.weight" label="น้ำหนัก (เช่น 0.30)" type="number" step="0.05" min="0" :rules="[(v) => v >= 0 || 'ต้องไม่ติดลบ']" />
              </v-col>
              <v-col cols="12" sm="6"><v-switch v-model="topicForm.active" label="เปิดใช้งาน" color="success" inset hide-details /></v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="topicDialog = false">ยกเลิก</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="saveTopic">บันทึก</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ฟอร์มตัวชี้วัด -->
    <v-dialog v-model="indDialog" max-width="640" persistent>
      <v-card>
        <v-card-title>{{ indForm.id ? 'แก้ไขตัวชี้วัด' : 'เพิ่มตัวชี้วัด' }}</v-card-title>
        <v-card-text>
          <v-form ref="indRef">
            <v-row dense>
              <v-col cols="12">
                <v-select v-model="indForm.topic_id" :items="topics" item-value="id" :item-title="(t) => `${t.code} ${t.title_th}`" label="ด้าน *" :rules="[req]" />
              </v-col>
              <v-col cols="12" sm="4"><v-text-field v-model="indForm.code" label="รหัส *" :rules="[req]" /></v-col>
              <v-col cols="12" sm="8"><v-text-field v-model="indForm.name_th" label="ชื่อตัวชี้วัด *" :rules="[req]" /></v-col>
              <v-col cols="12"><v-textarea v-model="indForm.description" label="คำอธิบาย / เกณฑ์" /></v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="indForm.type" :items="typeItems" label="รูปแบบการให้คะแนน *" :rules="[req]" />
              </v-col>
              <v-col cols="12" sm="6"><v-text-field v-model.number="indForm.weight" label="น้ำหนัก" type="number" step="0.5" min="0.1" /></v-col>
              <template v-if="indForm.type === 'score_1_4'">
                <v-col cols="6"><v-text-field v-model.number="indForm.min_score" label="คะแนนต่ำสุด" type="number" /></v-col>
                <v-col cols="6"><v-text-field v-model.number="indForm.max_score" label="คะแนนสูงสุด" type="number" /></v-col>
              </template>
              <v-col cols="12">
                <v-autocomplete
                  v-model="indForm.evidence_type_ids"
                  :items="evidenceTypes"
                  item-value="id"
                  item-title="name_th"
                  label="ชนิดหลักฐานที่ใช้ได้"
                  multiple
                  chips
                  closable-chips
                  hint="ครูจะเลือกได้เฉพาะชนิดหลักฐานเหล่านี้เมื่ออัปโหลด"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12"><v-switch v-model="indForm.active" label="เปิดใช้งาน" color="success" inset hide-details /></v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="indDialog = false">ยกเลิก</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="saveIndicator">บันทึก</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
definePageMeta({ roles: ['admin'] })

const { $api } = useNuxtApp()
const notify = useNotify()
const confirm = useConfirm()
const req = (v) => !!(v ?? '').toString().trim() || 'กรุณากรอกข้อมูล'
const typeItems = Object.entries(INDICATOR_TYPES).map(([value, title]) => ({ value, title }))

const topics = ref([])
const evidenceTypes = ref([])
const loading = ref(false)
const open = ref([])
const showInactive = ref(false)

const visibleTopics = computed(() => topics.value.filter((t) => showInactive.value || t.active))
const visibleIndicators = (t) => t.indicators.filter((i) => showInactive.value || i.active)
const weightSum = computed(() => Math.round(topics.value.filter((t) => t.active).reduce((s, t) => s + Number(t.weight), 0) * 100) / 100)

async function load() {
  loading.value = true
  try {
    const [t, l] = await Promise.all([$api.get('/api/topics', { params: { all: 1 } }), $api.get('/api/lookups')])
    topics.value = t.data.data
    evidenceTypes.value = l.data.data.evidence_types
    if (!open.value.length) open.value = topics.value.map((x) => x.id)
  } catch (e) {
    notify.apiError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const saving = ref(false)

// ----- ด้าน -----
const topicDialog = ref(false)
const topicRef = ref()
const topicForm = ref({})
function openTopic(t) {
  topicForm.value = t ? { ...t, active: !!t.active } : { id: null, code: `TOP${topics.value.length + 1}`, title_th: '', description: '', weight: 0, active: true }
  topicDialog.value = true
}
async function saveTopic() {
  if (!(await topicRef.value.validate()).valid) return
  saving.value = true
  try {
    const { id, indicators, created_at, ...body } = topicForm.value
    if (id) await $api.put(`/api/topics/${id}`, body)
    else await $api.post('/api/topics', body)
    notify.success('บันทึกด้านการประเมินเรียบร้อย')
    topicDialog.value = false
    load()
  } catch (e) {
    notify.apiError(e)
  } finally {
    saving.value = false
  }
}
async function removeTopic(t) {
  if (!(await confirm({ title: 'ลบด้านการประเมิน', text: `ต้องการลบ "${t.title_th}" และตัวชี้วัดทั้งหมดในด้านนี้ใช่หรือไม่?`, okText: 'ลบ', color: 'error' }))) return
  try {
    await $api.delete(`/api/topics/${t.id}`)
    notify.success('ลบด้านการประเมินเรียบร้อย')
    load()
  } catch (e) {
    notify.apiError(e)
  }
}

// ----- ตัวชี้วัด -----
const indDialog = ref(false)
const indRef = ref()
const indForm = ref({})
function openIndicator(i, t) {
  indForm.value = i
    ? { ...i, active: !!i.active, evidence_type_ids: i.evidence_types.map((e) => e.id) }
    : { id: null, topic_id: t.id, code: '', name_th: '', description: '', type: 'score_1_4', weight: 1, min_score: 1, max_score: 4, active: true, evidence_type_ids: [] }
  indDialog.value = true
}
async function saveIndicator() {
  if (!(await indRef.value.validate()).valid) return
  saving.value = true
  try {
    const { id, evidence_types, created_at, ...body } = indForm.value
    if (id) await $api.put(`/api/indicators/${id}`, body)
    else await $api.post('/api/indicators', body)
    notify.success('บันทึกตัวชี้วัดเรียบร้อย')
    indDialog.value = false
    load()
  } catch (e) {
    notify.apiError(e)
  } finally {
    saving.value = false
  }
}
async function removeIndicator(i) {
  if (!(await confirm({ title: 'ลบตัวชี้วัด', text: `ต้องการลบ "${i.code} ${i.name_th}" ใช่หรือไม่?`, okText: 'ลบ', color: 'error' }))) return
  try {
    await $api.delete(`/api/indicators/${i.id}`)
    notify.success('ลบตัวชี้วัดเรียบร้อย')
    load()
  } catch (e) {
    notify.apiError(e)
  }
}
</script>
