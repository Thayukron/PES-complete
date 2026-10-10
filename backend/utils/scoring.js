// utils/scoring.js
// สูตรคำนวณคะแนน (ฟังก์ชันล้วน ไม่แตะฐานข้อมูล -> เขียน unit test ได้ง่าย)
//
// 1) คะแนนตัวชี้วัดเป็นร้อยละ
//    - score_1_4 : score / max_score * 100   (เช่น 3 จาก 4 = 75%)
//    - yes_no / file_url : มี = 100, ไม่มี = 0
// 2) คะแนนด้าน (topic) = ค่าเฉลี่ยถ่วงน้ำหนักของตัวชี้วัดในด้านนั้น (น้ำหนัก indicators.weight)
// 3) คะแนนรวม = ค่าเฉลี่ยถ่วงน้ำหนักของด้าน (น้ำหนัก evaluation_topics.weight)
//    ถ้าทุกด้านน้ำหนักเป็น 0 ให้ถือว่าน้ำหนักเท่ากัน

const round2 = (n) => Math.round(n * 100) / 100;

function indicatorPercent(indicator, value) {
  if (!value) return null;
  if (indicator.type === 'score_1_4') {
    if (value.score === null || value.score === undefined || value.score === '') return null;
    const max = Number(indicator.max_score) || 4;
    return round2((Number(value.score) / max) * 100);
  }
  if (value.value_yes_no === null || value.value_yes_no === undefined) return null;
  return Number(value.value_yes_no) ? 100 : 0;
}

function weightedAverage(items) {
  const valid = items.filter((x) => x.percent !== null && x.percent !== undefined);
  if (!valid.length) return null;
  let wSum = valid.reduce((s, x) => s + Number(x.weight || 0), 0);
  if (wSum <= 0) return round2(valid.reduce((s, x) => s + x.percent, 0) / valid.length);
  return round2(valid.reduce((s, x) => s + x.percent * Number(x.weight || 0), 0) / wSum);
}

// ระดับผลการประเมินจากคะแนนร้อยละ
function levelOf(percent) {
  if (percent === null || percent === undefined) return null;
  if (percent >= 90) return 'ดีเด่น';
  if (percent >= 80) return 'ดีมาก';
  if (percent >= 70) return 'ดี';
  if (percent >= 60) return 'พอใช้';
  return 'ปรับปรุง';
}

// เกณฑ์ผ่านแบบประเมิน PA: ได้คะแนนจากกรรมการแต่ละคนไม่ต่ำกว่าร้อยละ 70
const PA_PASS_PERCENT = 70;

/**
 * คำนวณคะแนนรวมจากโครงสร้างด้าน/ตัวชี้วัด
 * @param topics [{ id, weight, pa_weight, indicators: [{ id, type, max_score, weight }] }]
 * @param valuesByIndicator { [indicator_id]: { score, value_yes_no } }
 * @param weightKey 'weight' = แบบประเมินผลการปฏิบัติงาน (เลื่อนเงินเดือน), 'pa_weight' = แบบประเมิน PA
 *
 * ด้านที่น้ำหนักเป็น 0 ไม่ถูกนับ (เช่น องค์ประกอบที่ 2-3 ไม่อยู่ในแบบ PA)
 * ถ้าน้ำหนักรวมของทุกด้านเท่ากับ 100% คะแนนร้อยละ = คะแนนเต็ม 100 ตามแบบฟอร์ม
 */
function computeTotals(topics, valuesByIndicator, weightKey = 'weight') {
  const anyWeight = topics.some((t) => Number(t[weightKey] || 0) > 0);
  const counted = anyWeight ? topics.filter((t) => Number(t[weightKey] || 0) > 0) : topics;
  const topicResults = counted.map((t) => {
    const indicators = t.indicators.map((i) => ({
      id: i.id,
      weight: i.weight,
      percent: indicatorPercent(i, valuesByIndicator[i.id]),
    }));
    const percent = weightedAverage(indicators);
    // ไม่มีด้านใดกำหนดน้ำหนัก -> ถือว่าเท่ากันทุกด้าน
    const weight = anyWeight ? Number(t[weightKey]) : 1 / counted.length;
    return {
      id: t.id,
      weight,
      percent,
      // คะแนนที่ได้ / คะแนนเต็มของด้าน (เทียบฐาน 100 ตามน้ำหนัก)
      points: percent === null ? null : round2(percent * weight),
      full_points: round2(weight * 100),
      scored: indicators.filter((x) => x.percent !== null).length,
      total: indicators.length,
      indicators,
    };
  });
  const percent = weightedAverage(topicResults);
  return {
    percent,
    level: levelOf(percent),
    scored: topicResults.reduce((s, t) => s + t.scored, 0),
    total: topicResults.reduce((s, t) => s + t.total, 0),
    topics: topicResults,
  };
}

// ผลแบบ PA: คะแนนจากกรรมการแต่ละคนต้อง >= 70% จึงผ่าน
function paResult(topics, valuesByEvaluator) {
  const list = valuesByEvaluator.map((v) => computeTotals(topics, v, 'pa_weight').percent);
  if (!list.length || list.some((p) => p === null)) return { pass: null, min_percent: null };
  const min = Math.min(...list);
  return { pass: min >= PA_PASS_PERCENT, min_percent: min };
}

// ค่าเฉลี่ยของกรรมการหลายคนต่อ 1 ตัวชี้วัด (score เฉลี่ย, yes_no ใช้เสียงข้างมาก)
function averageValues(rows) {
  if (!rows.length) return null;
  const scores = rows.map((r) => r.score).filter((v) => v !== null && v !== undefined);
  const yn = rows.map((r) => r.value_yes_no).filter((v) => v !== null && v !== undefined);
  return {
    score: scores.length ? round2(scores.reduce((s, v) => s + Number(v), 0) / scores.length) : null,
    value_yes_no: yn.length ? (yn.filter((v) => Number(v)).length * 2 >= yn.length ? 1 : 0) : null,
  };
}

module.exports = { indicatorPercent, weightedAverage, levelOf, computeTotals, averageValues, paResult, round2, PA_PASS_PERCENT };
