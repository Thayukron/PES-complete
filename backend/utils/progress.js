// utils/progress.js
// รวบรวมความคืบหน้าของครูหลายคนในคราวเดียว (ใช้ในหน้ารายการงาน/ติดตาม/รายงาน)
const db = require('../db/knex');
const { loadTopics } = require('../controllers/topics.controller');
const { computeTotals, averageValues, paResult } = require('./scoring');

/**
 * @param periodId รอบการประเมิน
 * @param pairs [{ evaluator_id, evaluatee_id }] คู่กรรมการ-ครู ที่ต้องการ
 * @returns รายการครู (ไม่ซ้ำ) พร้อมสถานะหลักฐาน/ประเมินตนเอง/กรรมการ/คะแนนรวม
 */
async function summarize(periodId, pairs) {
  const evaluateeIds = [...new Set(pairs.map((p) => p.evaluatee_id))];
  if (!evaluateeIds.length) return [];

  const [topics, users, files, selfRows, results] = await Promise.all([
    loadTopics(),
    db('users as u').leftJoin('departments as d', 'd.id', 'u.department_id')
      .whereIn('u.id', [...new Set([...evaluateeIds, ...pairs.map((p) => p.evaluator_id)])])
      .select('u.id', 'u.name_th', 'u.email', 'u.department_id', 'd.name_th as department_name'),
    db('attachments').where({ period_id: periodId }).whereIn('evaluatee_id', evaluateeIds)
      .select('evaluatee_id', 'indicator_id'),
    db('self_assessments').where({ period_id: periodId }).whereIn('evaluatee_id', evaluateeIds)
      .select('evaluatee_id', 'status'),
    db('evaluation_results').where({ period_id: periodId }).whereIn('evaluatee_id', evaluateeIds)
      .select('evaluatee_id', 'evaluator_id', 'indicator_id', 'score', 'value_yes_no', 'status'),
  ]);

  const userById = Object.fromEntries(users.map((u) => [u.id, u]));
  const activeIndicatorIds = new Set(topics.flatMap((t) => t.indicators.map((i) => i.id)));
  const totalIndicators = activeIndicatorIds.size;

  return evaluateeIds.map((eid) => {
    const u = userById[eid] || {};
    const myFiles = files.filter((f) => f.evaluatee_id === eid && activeIndicatorIds.has(f.indicator_id));
    const mySelf = selfRows.filter((r) => r.evaluatee_id === eid);
    const myResults = results.filter((r) => r.evaluatee_id === eid);

    const evaluators = pairs.filter((p) => p.evaluatee_id === eid).map((p) => {
      const rows = myResults.filter((r) => r.evaluator_id === p.evaluator_id);
      return {
        id: p.evaluator_id,
        name: userById[p.evaluator_id]?.name_th || '-',
        status: statusOf(rows),
        scored: rows.filter((r) => activeIndicatorIds.has(r.indicator_id)).length,
      };
    });

    // คะแนนรวมคิดจากผลที่ "ส่งแล้ว" เท่านั้น (เฉลี่ยหลายกรรมการ)
    const submitted = myResults.filter((r) => r.status === 'submitted');
    const values = {};
    for (const iid of activeIndicatorIds) {
      const avg = averageValues(submitted.filter((r) => r.indicator_id === iid));
      if (avg) values[iid] = avg;
    }
    const totals = submitted.length ? computeTotals(topics, values) : { percent: null, level: null };
    const paTotals = submitted.length ? computeTotals(topics, values, 'pa_weight') : { percent: null };
    const pa = paResult(topics, [...new Set(submitted.map((r) => r.evaluator_id))].map((id) =>
      Object.fromEntries(submitted.filter((r) => r.evaluator_id === id).map((r) => [r.indicator_id, r]))));

    return {
      evaluatee_id: eid,
      name_th: u.name_th,
      email: u.email,
      department_id: u.department_id,
      department_name: u.department_name,
      indicators_total: totalIndicators,
      indicators_with_files: new Set(myFiles.map((f) => f.indicator_id)).size,
      files_count: myFiles.length,
      self_status: statusOf(mySelf),
      evaluators,
      evaluators_submitted: evaluators.filter((e) => e.status === 'submitted').length,
      percent: totals.percent,
      level: totals.level,
      pa_percent: paTotals.percent,
      pa_pass: pa.pass,
    };
  });
}

// สถานะจากกลุ่มแถว: none (ยังไม่เริ่ม) / draft (บันทึกร่าง) / submitted (ส่งแล้ว)
function statusOf(rows) {
  if (!rows.length) return 'none';
  return rows.some((r) => r.status === 'submitted') ? 'submitted' : 'draft';
}

module.exports = { summarize, statusOf };
