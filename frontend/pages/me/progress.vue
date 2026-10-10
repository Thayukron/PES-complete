<template>
  <div>
    <PageHeader title="ความคืบหน้า" subtitle="สถานะหลักฐาน การประเมินตนเอง และการประเมินของกรรมการ">
      <PeriodSelect @change="load" />
    </PageHeader>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <template v-if="r">
      <v-row class="mb-2">
        <v-col cols="12" sm="6" md="3">
          <StatCard label="ตัวชี้วัดที่มีหลักฐาน" :value="`${withFiles} / ${indicators.length}`" icon="mdi-file-check-outline" color="primary" />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <StatCard label="ประเมินตนเอง" :value="STATUS[r.self_status].text" icon="mdi-star-check-outline" :color="STATUS[r.self_status].color" />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <StatCard label="คะแนนประเมินตนเอง" :value="pct(r.self_totals.percent)" icon="mdi-account-star-outline" color="teal" />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <StatCard label="กรรมการส่งผลแล้ว" :value="`${r.evaluators.filter((e) => e.status === 'submitted').length} / ${r.evaluators.length}`" icon="mdi-account-check-outline" color="success" />
        </v-col>
      </v-row>

      <v-card class="mb-4">
        <v-card-title>กรรมการประเมิน</v-card-title>
        <v-card-text>
          <div v-if="!r.evaluators.length" class="text-medium-emphasis">ยังไม่ได้กำหนดกรรมการ</div>
          <div v-for="e in r.evaluators" :key="e.id" class="d-flex align-center ga-3 mb-2">
            <v-icon icon="mdi-account-tie-outline" />{{ e.name }}<StatusChip :status="e.status" />
          </div>
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-title>รายตัวชี้วัด</v-card-title>
        <v-table density="comfortable">
          <thead>
            <tr><th>ตัวชี้วัด</th><th class="text-center">หลักฐาน</th><th class="text-center">ประเมินตนเอง</th><th></th></tr>
          </thead>
          <tbody>
            <template v-for="t in r.topics" :key="t.id">
              <tr class="bg-surface-light"><td colspan="4"><strong>{{ t.code }} {{ t.title_th }}</strong></td></tr>
              <tr v-for="i in t.indicators" :key="i.id">
                <td>{{ i.code }} {{ i.name_th }}</td>
                <td class="text-center">
                  <v-chip :color="i.files.length ? 'success' : 'warning'" size="small" variant="tonal">
                    {{ i.files.length ? `${i.files.length} ไฟล์` : 'ยังไม่มี' }}
                  </v-chip>
                </td>
                <td class="text-center">{{ valueText(i, i.self) }}</td>
                <td class="text-end">
                  <v-btn v-if="!i.files.length" :to="{ path: '/me/evidence', query: { indicator: i.id } }" size="small" variant="text" color="primary">อัปโหลด</v-btn>
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
const indicators = computed(() => r.value?.topics.flatMap((t) => t.indicators) || [])
const withFiles = computed(() => indicators.value.filter((i) => i.files.length).length)
onMounted(load)
</script>
