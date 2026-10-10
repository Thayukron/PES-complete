<template>
  <div>
    <PageHeader title="ผลการประเมินและข้อเสนอแนะ" :subtitle="r?.period?.name_th || ''">
      <PeriodSelect @change="load" />
      <v-btn to="/report/me" variant="tonal" prepend-icon="mdi-printer-outline">พิมพ์รายงาน</v-btn>
    </PageHeader>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <template v-if="r">
      <v-alert v-if="!r.completed" type="info" variant="tonal" class="mb-4">
        กรรมการยังประเมินไม่ครบทุกท่าน (ส่งผลแล้ว {{ submittedCount }} / {{ r.evaluators.length }} ท่าน)
        <span v-if="submittedCount">— คะแนนด้านล่างคิดจากกรรมการที่ส่งผลแล้ว</span>
      </v-alert>

      <v-row class="mb-2">
        <v-col cols="12" md="4">
          <v-card class="mb-4 text-center" :color="r.totals.level ? levelColor(r.totals.level) : undefined" variant="tonal">
            <v-card-text>
              <div class="text-body-2">แบบประเมินผลการปฏิบัติงาน (เลื่อนเงินเดือน)</div>
              <div class="text-h3 font-weight-bold my-2">{{ score(r.totals.percent) }}<span class="text-h6"> / 100</span></div>
              <div class="text-h6">{{ r.totals.level || 'รอผลการประเมิน' }}</div>
            </v-card-text>
          </v-card>
          <v-card class="text-center" :color="r.pa_totals.pass === null ? undefined : r.pa_totals.pass ? 'success' : 'error'" variant="tonal">
            <v-card-text>
              <div class="text-body-2">แบบประเมิน PA (PA2/ส)</div>
              <div class="text-h4 font-weight-bold my-2">{{ score(r.pa_totals.percent) }}<span class="text-h6"> / 100</span></div>
              <div class="text-h6">{{ r.pa_totals.pass === null ? 'รอผลการประเมิน' : r.pa_totals.pass ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์' }}</div>
              <div class="text-caption">เกณฑ์: กรรมการแต่ละคนให้ไม่ต่ำกว่าร้อยละ {{ r.pa_totals.pass_percent }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="8">
          <v-card class="h-100">
            <v-card-title>คะแนนรายด้าน</v-card-title>
            <v-card-text>
              <div v-for="t in r.topics" :key="t.id" class="mb-3">
                <div class="d-flex justify-space-between text-body-2 mb-1">
                  <span>{{ t.title_th }}</span>
                  <span class="text-no-wrap ml-2">กรรมการ <strong>{{ score(t.points) }}</strong> · ตนเอง {{ score(t.self_points) }} / {{ score(t.full_points) }} คะแนน</span>
                </div>
                <v-progress-linear :model-value="t.percent || 0" height="10" rounded color="primary" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="mb-4">
        <v-card-title><v-icon icon="mdi-message-text-outline" class="mr-2" />ข้อเสนอแนะจากกรรมการ</v-card-title>
        <v-card-text>
          <div v-if="!r.feedback.length" class="text-medium-emphasis">ยังไม่มีข้อเสนอแนะ</div>
          <v-alert v-for="f in r.feedback" :key="f.evaluator_id" variant="tonal" color="primary" class="mb-2" border="start">
            <div class="text-pre">{{ f.comment }}</div>
            <div class="text-caption mt-1">— {{ f.evaluator_name }} · {{ thDate(f.updated_at) }}</div>
          </v-alert>
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-title>ผลรายตัวชี้วัด</v-card-title>
        <v-table density="comfortable">
          <thead>
            <tr><th>ตัวชี้วัด</th><th class="text-center">ตนเอง</th><th class="text-center">กรรมการ</th><th>ความเห็นกรรมการ</th></tr>
          </thead>
          <tbody>
            <template v-for="t in r.topics" :key="t.id">
              <tr class="bg-surface-light"><td colspan="4"><strong>{{ t.code }} {{ t.title_th }}</strong></td></tr>
              <tr v-for="i in t.indicators" :key="i.id">
                <td>{{ i.code }} {{ i.name_th }}</td>
                <td class="text-center">{{ valueText(i, i.self) }}</td>
                <td class="text-center font-weight-bold">{{ valueText(i, i.final) }}</td>
                <td class="text-body-2">
                  <div v-for="e in i.evaluators.filter((x) => x.notes)" :key="e.evaluator_id" class="text-pre">{{ e.notes }}</div>
                </td>
              </tr>
            </template>
          </tbody>
        </v-table>
      </v-card>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ roles: ['evaluatee'] })

const { r, loading, load } = useEvaluateeReport(() => useAuthStore().user?.id)
const score = (v) => (v === null || v === undefined ? '-' : Number(v).toFixed(2).replace(/.00$/, ''))
const submittedCount = computed(() => r.value?.evaluators.filter((e) => e.status === 'submitted').length || 0)
onMounted(load)
</script>
