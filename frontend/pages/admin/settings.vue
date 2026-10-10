<template>
  <div>
    <PageHeader title="ข้อมูลพื้นฐาน" subtitle="แผนกวิชา ฝ่าย และชนิดหลักฐาน" />

    <v-card>
      <v-tabs v-model="tab" color="primary">
        <v-tab v-for="c in configs" :key="c.key" :value="c.key" :prepend-icon="c.icon">{{ c.title }}</v-tab>
      </v-tabs>
      <v-divider />
      <v-window v-model="tab">
        <v-window-item v-for="c in configs" :key="c.key" :value="c.key">
          <v-card-text class="d-flex flex-wrap ga-2">
            <v-text-field v-model="search[c.key]" label="ค้นหา" prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 360px" />
            <v-spacer />
            <v-btn color="primary" prepend-icon="mdi-plus" @click="open(c)">เพิ่ม{{ c.title }}</v-btn>
          </v-card-text>
          <v-data-table
            :headers="[...c.headers, { title: 'จัดการ', key: 'actions', sortable: false, align: 'end' }]"
            :items="data[c.list] || []"
            :search="search[c.key]"
            no-data-text="ยังไม่มีข้อมูล"
            items-per-page-text="แถวต่อหน้า"
          >
            <template #item.actions="{ item }">
              <v-btn icon="mdi-pencil" variant="text" size="small" @click="open(c, item)" />
              <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="remove(c, item)" />
            </template>
          </v-data-table>
        </v-window-item>
      </v-window>
    </v-card>

    <v-dialog v-model="dialog" max-width="520" persistent>
      <v-card v-if="current">
        <v-card-title>{{ form.id ? 'แก้ไข' : 'เพิ่ม' }}{{ current.title }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <template v-for="f in current.fields" :key="f.key">
              <v-select
                v-if="f.items"
                v-model="form[f.key]"
                :items="data[f.items] || []"
                item-title="name_th"
                item-value="id"
                :label="f.label"
                :rules="f.required ? [req] : []"
                class="mb-2"
              />
              <v-textarea v-else-if="f.textarea" v-model="form[f.key]" :label="f.label" class="mb-2" />
              <v-text-field v-else v-model="form[f.key]" :label="f.label" :rules="f.required ? [req] : []" class="mb-2" />
            </template>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">ยกเลิก</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="save">บันทึก</v-btn>
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

const configs = [
  {
    key: 'dept', title: 'แผนกวิชา', icon: 'mdi-domain', api: 'departments', list: 'departments',
    headers: [{ title: 'รหัส', key: 'code' }, { title: 'ชื่อแผนกวิชา', key: 'name_th' }, { title: 'ประเภทวิชา', key: 'category_name' }, { title: 'ฝ่าย', key: 'org_group_name' }],
    fields: [
      { key: 'code', label: 'รหัส *', required: true },
      { key: 'name_th', label: 'ชื่อแผนกวิชา *', required: true },
      { key: 'category_id', label: 'ประเภทวิชา *', items: 'vocational_categories', required: true },
      { key: 'org_group_id', label: 'ฝ่าย *', items: 'org_groups', required: true },
    ],
  },
  {
    key: 'org', title: 'ฝ่าย', icon: 'mdi-sitemap-outline', api: 'org-groups', list: 'org_groups',
    headers: [{ title: 'รหัส', key: 'code' }, { title: 'ชื่อฝ่าย', key: 'name_th' }],
    fields: [{ key: 'code', label: 'รหัส *', required: true }, { key: 'name_th', label: 'ชื่อฝ่าย *', required: true }],
  },
  {
    key: 'ev', title: 'ชนิดหลักฐาน', icon: 'mdi-file-certificate-outline', api: 'evidence-types', list: 'evidence_types',
    headers: [{ title: 'รหัส', key: 'code' }, { title: 'ชื่อชนิดหลักฐาน', key: 'name_th' }, { title: 'คำอธิบาย', key: 'description' }],
    fields: [
      { key: 'code', label: 'รหัส *', required: true },
      { key: 'name_th', label: 'ชื่อชนิดหลักฐาน *', required: true },
      { key: 'description', label: 'คำอธิบาย', textarea: true },
    ],
  },
]

const tab = ref('dept')
const data = ref({})
const search = reactive({})

async function load() {
  try { data.value = (await $api.get('/api/lookups')).data.data } catch (e) { notify.apiError(e) }
}
onMounted(load)

const dialog = ref(false)
const saving = ref(false)
const formRef = ref()
const current = ref(null)
const form = ref({})

function open(c, item) {
  current.value = c
  form.value = item ? { ...item } : { id: null }
  dialog.value = true
}

async function save() {
  if (!(await formRef.value.validate()).valid) return
  saving.value = true
  try {
    const body = Object.fromEntries(current.value.fields.map((f) => [f.key, form.value[f.key] ?? null]))
    if (form.value.id) await $api.put(`/api/${current.value.api}/${form.value.id}`, body)
    else await $api.post(`/api/${current.value.api}`, body)
    notify.success('บันทึกเรียบร้อย')
    dialog.value = false
    load()
  } catch (e) {
    notify.apiError(e)
  } finally {
    saving.value = false
  }
}

async function remove(c, item) {
  if (!(await confirm({ title: `ลบ${c.title}`, text: `ต้องการลบ "${item.name_th}" ใช่หรือไม่?`, okText: 'ลบ', color: 'error' }))) return
  try {
    await $api.delete(`/api/${c.api}/${item.id}`)
    notify.success('ลบเรียบร้อย')
    load()
  } catch (e) {
    notify.apiError(e)
  }
}
</script>
