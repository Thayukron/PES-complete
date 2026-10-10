<!-- รายงานผลการประเมินรายบุคคล (พิมพ์/บันทึกเป็น PDF ได้จากเบราว์เซอร์) -->
<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-2 mb-4 no-print">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.back()">กลับ</v-btn>
      <v-spacer />
      <PeriodSelect @change="load" />
      <v-btn variant="tonal" prepend-icon="mdi-file-delimited-outline" :disabled="!r" @click="exportCsv">ส่งออก CSV</v-btn>
      <v-btn color="primary" prepend-icon="mdi-printer" :disabled="!r" @click="print">พิมพ์ / บันทึก PDF</v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <v-card v-if="r" class="report pa-2">
      <v-card-text>
        <div class="text-center mb-4">
          <div class="text-h6 font-weight-bold">แบบรายงานผลการประเมินบุคลากร</div>
          <div class="text-subtitle-1">{{ r.period.name_th }}</div>
        </div>

        <v-row dense class="mb-2 text-body-2">
          <v-col cols="12" sm="6"><strong>ชื่อ-นามสกุล:</strong> {{ r.evaluatee.name_th }}</v-col>
          <v-col cols="12" sm="6"><strong>อีเมล:</strong> {{ r.evaluatee.email }}</v-col>
          <v-col cols="12" sm="6"><strong>แผนกวิชา:</strong> {{ r.evaluatee.department_name || '-' }}</v-col>
          <v-col cols="12" sm="6"><strong>ฝ่าย:</strong> {{ r.evaluatee.org_group_name || '-' }}</v-col>
          <v-col cols="12" sm="6"><strong>ช่วงเวลา:</strong> {{ thDate(r.period.start_date) }} – {{ thDate(r.period.end_date) }}</v-col>
          <v-col cols="12" sm="6"><strong>กรรมการ:</strong> {{ r.evaluators.map((e) => `${e.name} (${STATUS[e.status].text})`).join(', ') || '-' }}</v-col>
        </v-row>

        <v-alert v-if="!r.completed" type="warning" variant="tonal" density="compact" class="mb-3">
          รายงานนี้ยังไม่สมบูรณ์: กรรมการยังส่งผลไม่ครบทุกท่าน
        </v-alert>

        <table class="rpt">
          <thead>
            <tr>
              <th style="width: 120px">รหัส</th><th>ตัวชี้วัด</th><th style="width: 70px">หลักฐาน</th>
              <th style="width: 90px">ตนเอง</th><th style="width: 90px">กรรมการ</th><th style="width: 90px">ร้อยละ / คะแนน</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="t in r.topics" :key="t.id">
              <tr class="topic">
                <td colspan="5">{{ t.code }} {{ t.title_th }}</td>
                <td class="num">{{ num(t.points) }} / {{ num(t.full_points) }}</td>
              </tr>
              <tr v-for="i in t.indicators" :key="i.id">
                <td class="text-no-wrap">{{ i.code }}</td>
                <td>
                  {{ i.name_th }}
                  <div v-for="e in i.evaluators.filter((x) => x.notes)" :key="e.evaluator_id" class="note">ความเห็น: {{ e.notes }}</div>
                </td>
                <td class="num">{{ i.files.length }}</td>
                <td class="num">{{ valueText(i, i.self) }}</td>
                <td class="num">{{ valueText(i, i.final) }}</td>
                <td class="num">{{ pct(i.final?.percent) }}</td>
              </tr>
            </template>
          </tbody>
        </table>

        <!-- สรุปคะแนนตามแบบฟอร์มทั้ง 2 แบบ -->
        <v-row class="mt-4">
          <v-col cols="12" md="7">
            <div class="font-weight-bold mb-1">สรุปผลแบบประเมินผลการปฏิบัติงาน (เลื่อนเงินเดือน)</div>
            <table class="rpt">
              <thead><tr><th>องค์ประกอบ/ด้าน</th><th class="num">เต็ม</th><th class="num">ตนเอง</th><th class="num">ผู้บังคับบัญชา/กรรมการ</th></tr></thead>
              <tbody>
                <tr v-for="t in r.topics.filter((x) => x.full_points)" :key="t.id">
                  <td>{{ t.title_th }}</td><td class="num">{{ num(t.full_points) }}</td>
                  <td class="num">{{ num(t.self_points) }}</td><td class="num">{{ num(t.points) }}</td>
                </tr>
                <tr class="total">
                  <td>คะแนนรวม</td><td class="num">100</td>
                  <td class="num">{{ num(r.self_totals.percent) }}</td>
                  <td class="num">{{ num(r.totals.percent) }} {{ r.totals.level ? `(${r.totals.level})` : '' }}</td>
                </tr>
              </tbody>
            </table>
          </v-col>
          <v-col cols="12" md="5">
            <div class="font-weight-bold mb-1">สรุปผลแบบประเมิน PA (PA2/ส)</div>
            <table class="rpt">
              <thead><tr><th>ส่วน/ด้าน</th><th class="num">เต็ม</th><th class="num">ตนเอง</th><th class="num">กรรมการ</th></tr></thead>
              <tbody>
                <tr v-for="t in r.topics.filter((x) => x.pa_full_points)" :key="t.id">
                  <td>{{ t.title_th }}</td><td class="num">{{ num(t.pa_full_points) }}</td>
                  <td class="num">{{ num(t.pa_self_points) }}</td><td class="num">{{ num(t.pa_points) }}</td>
                </tr>
                <tr class="total">
                  <td>คะแนนรวม</td><td class="num">100</td>
                  <td class="num">{{ num(r.pa_totals.self_percent) }}</td>
                  <td class="num">{{ num(r.pa_totals.percent) }}</td>
                </tr>
                <tr>
                  <td colspan="4">
                    เกณฑ์ผ่าน: ได้คะแนนจากกรรมการแต่ละคนไม่ต่ำกว่าร้อยละ {{ r.pa_totals.pass_percent }} —
                    <strong v-if="r.pa_totals.pass === null">รอผลการประเมิน</strong>
                    <strong v-else :class="r.pa_totals.pass ? 'text-success' : 'text-error'">
                      {{ r.pa_totals.pass ? 'ผ่าน' : 'ไม่ผ่าน' }} (ต่ำสุด {{ num(r.pa_totals.min_percent) }})
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </v-col>
        </v-row>

        <div class="mt-4">
          <div class="font-weight-bold mb-1">ข้อเสนอแนะจากกรรมการ</div>
          <div v-if="!r.feedback.length" class="text-medium-emphasis">-</div>
          <div v-for="f in r.feedback" :key="f.evaluator_id" class="mb-2">
            <div class="text-pre">{{ f.comment }}</div>
            <div class="text-caption">— {{ f.evaluator_name }}</div>
          </div>
        </div>

        <div class="signs mt-10">
          <div v-for="label in ['ผู้รับการประเมิน', 'กรรมการประเมิน', 'ผู้อำนวยการ']" :key="label" class="sign">
            <div>ลงชื่อ ......................................................</div>
            <div>(......................................................)</div>
            <div>{{ label }}</div>
          </div>
        </div>
        <div class="text-caption text-medium-emphasis mt-6">
          พิมพ์เมื่อ {{ thDate(new Date().toISOString().slice(0, 16).replace('T', ' '), true) }} · เกณฑ์ระดับ: ≥90 ดีเด่น, ≥80 ดีมาก, ≥70 ดี, ≥60 พอใช้, &lt;60 ปรับปรุง
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
definePageMeta({ title: 'รายงานผลการประเมิน' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const evaluateeId = computed(() => (route.params.id === 'me' ? auth.user?.id : Number(route.params.id)))
const { r, loading, load } = useEvaluateeReport(() => evaluateeId.value)
onMounted(load)

const print = () => window.print()
const num = (v) => (v === null || v === undefined ? '-' : Number(v).toFixed(2).replace(/\.00$/, ''))

function exportCsv() {
  const rows = []
  for (const t of r.value.topics) {
    for (const i of t.indicators) {
      rows.push([t.code, t.title_th, i.code, i.name_th, i.files.length, valueText(i, i.self), valueText(i, i.final), i.final?.percent ?? '',
        i.evaluators.map((e) => e.notes).filter(Boolean).join(' | ')])
    }
  }
  rows.push(['', '', '', 'คะแนนรวม', '', r.value.self_totals.percent ?? '', '', r.value.totals.percent ?? '', r.value.totals.level ?? ''])
  downloadCsv(
    `รายงาน_${r.value.evaluatee.name_th}_${r.value.period.code}.csv`,
    ['รหัสด้าน', 'ด้าน', 'รหัสตัวชี้วัด', 'ตัวชี้วัด', 'จำนวนหลักฐาน', 'ประเมินตนเอง', 'กรรมการ', 'ร้อยละ', 'ความเห็นกรรมการ'],
    rows
  )
}
</script>

<style scoped>
.rpt { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.rpt th, .rpt td { border: 1px solid rgba(var(--v-border-color), 0.4); padding: 6px 8px; vertical-align: top; }
.rpt th { background: rgba(var(--v-theme-primary), 0.08); text-align: left; }
.rpt .num { text-align: center; white-space: nowrap; }
.rpt .topic td { background: rgba(var(--v-theme-on-surface), 0.05); font-weight: 600; }
.rpt .total td { font-weight: 700; background: rgba(var(--v-theme-primary), 0.08); }
.note { font-size: 0.8rem; opacity: 0.75; }
.signs { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 24px; text-align: center; }
.sign div { margin-bottom: 4px; }
@media print {
  .report { border: none !important; }
  .rpt { font-size: 11pt; }
  .rpt th, .rpt td { border-color: #555; }
}
</style>
