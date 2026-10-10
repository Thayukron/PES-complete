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
  if (percent >= 90) return 'ดีเยี่ยม';
  if (percent >= 80) return 'ดีมาก';
  if (percent >= 70) return 'ดี';
  if (percent >= 60) return 'พอใช้';
  return 'ต้องปรับปรุง';
}

/**
 * คำนวณคะแนนรวมจากโครงสร้างด้าน/ตัวชี้วัด
 * @param topics [{ id, weight, indicators: [{ id, type, max_score, weight }] }]
 * @param valuesByIndicator { [indicator_id]: { score, value_yes_no } }
 */
function computeTotals(topics, valuesByIndicator) {
  const topicResults = topics.map((t) => {
    const indicators = t.indicators.map((i) => ({
      id: i.id,
      weight: i.weight,
      percent: indicatorPercent(i, valuesByIndicator[i.id]),
    }));
    return {
      id: t.id,
      weight: t.weight,
      percent: weightedAverage(indicators),
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

module.exports = { indicatorPercent, weightedAverage, levelOf, computeTotals, averageValues, round2 };
