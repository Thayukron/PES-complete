// controllers/evaluation.controller.js
// 1) การประเมินตนเองของครู (self_assessments)
// 2) การให้คะแนนของกรรมการ (evaluation_results + evaluation_feedback)
// ทั้งสองแบบ: บันทึกร่างได้หลายครั้ง -> "ส่ง" แล้วล็อก (admin เปิดให้แก้ไขใหม่ได้)
const db = require('../db/knex');
const { ah, httpError, toId, resolvePeriod, isAdmin, isEvaluatee, isAssigned } = require('../utils/authz');
const { loadTopics } = require('./topics.controller');
const { statusOf } = require('../utils/progress');

/**
 * ตรวจรายการคะแนนที่ส่งมาให้ตรงกับชนิดของตัวชี้วัด
 * items: [{ indicator_id, score, value_yes_no, notes }]
 * คืน Map(indicator_id -> แถวที่พร้อมบันทึก) — แถวที่ไม่มีค่าและไม่มีหมายเหตุจะถูกตัดทิ้ง
 */
async function validateItems(items, { requireAll }) {
  if (!Array.isArray(items)) throw httpError(422, 'รูปแบบข้อมูลคะแนนไม่ถูกต้อง');
  const topics = await loadTopics();
  const indicators = Object.fromEntries(topics.flatMap((t) => t.indicators).map((i) => [i.id, i]));
  const out = new Map();

  for (const it of items) {
    const ind = indicators[toId(it.indicator_id)];
    if (!ind) continue; // ตัวชี้วัดที่ปิดใช้งาน/ไม่มีอยู่ -> ข้าม
    const row = { indicator_id: ind.id, topic_id: ind.topic_id, score: null, value_yes_no: null, notes: null };

    if (ind.type === 'score_1_4') {
      if (it.score !== null && it.score !== undefined && it.score !== '') {
        const s = Number(it.score);
        if (!Number.isFinite(s) || s < ind.min_score || s > ind.max_score) {
          throw httpError(422, `คะแนนของ "${ind.name_th}" ต้องอยู่ระหว่าง ${ind.min_score}-${ind.max_score}`);
        }
        row.score = s;
      }
    } else if (it.value_yes_no !== null && it.value_yes_no !== undefined && it.value_yes_no !== '') {
      row.value_yes_no = Number(it.value_yes_no) ? 1 : 0;
    }
    if (it.notes) row.notes = String(it.notes).trim().slice(0, 2000) || null;

    if (row.score !== null || row.value_yes_no !== null || row.notes) out.set(ind.id, row);
  }

  if (requireAll) {
    const missing = Object.values(indicators).filter((i) => {
      const r = out.get(i.id);
      return !r || (i.type === 'score_1_4' ? r.score === null : r.value_yes_no === null);
    });
    if (missing.length) {
      throw httpError(422, `ยังให้คะแนนไม่ครบ ${missing.length} ตัวชี้วัด (เช่น ${missing[0].code} ${missing[0].name_th})`);
    }
  }
  return out;
}

async function assertPeriodOpen(periodId) {
  const period = await resolvePeriod(periodId);
  if (!period.is_active) throw httpError(409, 'รอบการประเมินนี้ปิดแล้ว ไม่สามารถแก้ไขได้');
  return period;
}

// ======================= ประเมินตนเอง =======================

// GET /api/self-assessments?period_id=&evaluatee_id=
exports.getSelf = ah(async (req, res) => {
  const period = await resolvePeriod(req.query.period_id);
  const evaluateeId = isEvaluatee(req.user) ? req.user.id : toId(req.query.evaluatee_id);
  if (!evaluateeId) throw httpError(422, 'กรุณาระบุครูผู้รับการประเมิน');
  if (!isEvaluatee(req.user) && !isAdmin(req.user)
    && !(await isAssigned({ period_id: period.id, evaluator_id: req.user.id, evaluatee_id: evaluateeId }))) {
    throw httpError(403, 'ไม่มีสิทธิ์ดูข้อมูลของบุคลากรท่านนี้');
  }
  const items = await db('self_assessments').where({ period_id: period.id, evaluatee_id: evaluateeId })
    .select('indicator_id', 'score', 'value_yes_no', 'notes', 'status', 'updated_at');
  res.json({ success: true, period, status: statusOf(items), data: items });
});

// PUT /api/self-assessments  body: { period_id, items: [...], submit: false|true }  (ครู)
exports.saveSelf = ah(async (req, res) => {
  const period = await assertPeriodOpen(req.body?.period_id);
  const where = { period_id: period.id, evaluatee_id: req.user.id };
  if (statusOf(await db('self_assessments').where(where)) === 'submitted') {
    throw httpError(409, 'ส่งแบบประเมินตนเองแล้ว หากต้องการแก้ไขกรุณาติดต่อผู้ดูแลระบบ');
  }
  const submit = !!req.body?.submit;
  const rows = await validateItems(req.body?.items, { requireAll: submit });
  const status = submit ? 'submitted' : 'draft';

  await db.transaction(async (trx) => {
    await trx('self_assessments').where(where).del();
    if (rows.size) {
      await trx('self_assessments').insert([...rows.values()].map(({ topic_id, ...r }) => ({ ...r, ...where, status })));
    }
  });
  res.json({ success: true, status: rows.size ? status : 'none', message: submit ? 'ส่งแบบประเมินตนเองเรียบร้อย' : 'บันทึกร่างเรียบร้อย' });
});

// POST /api/self-assessments/reopen  body: { period_id, evaluatee_id }  (admin)
exports.reopenSelf = ah(async (req, res) => {
  const period = await resolvePeriod(req.body?.period_id);
  const n = await db('self_assessments')
    .where({ period_id: period.id, evaluatee_id: toId(req.body?.evaluatee_id) })
    .update({ status: 'draft' });
  if (!n) throw httpError(404, 'ไม่พบแบบประเมินตนเอง');
  res.json({ success: true });
});

// ======================= กรรมการให้คะแนน =======================

// GET /api/results?period_id=&evaluatee_id=&evaluator_id=   (กรรมการดูของตัวเอง, admin ระบุ evaluator_id)
exports.getResults = ah(async (req, res) => {
  const period = await resolvePeriod(req.query.period_id);
  const evaluateeId = toId(req.query.evaluatee_id);
  const evaluatorId = isAdmin(req.user) ? toId(req.query.evaluator_id) : req.user.id;
  if (!evaluateeId || !evaluatorId) throw httpError(422, 'กรุณาระบุครูและกรรมการ');
  if (!(await isAssigned({ period_id: period.id, evaluator_id: evaluatorId, evaluatee_id: evaluateeId }))) {
    throw httpError(403, 'ไม่ได้รับมอบหมายให้ประเมินบุคลากรท่านนี้');
  }
  const where = { period_id: period.id, evaluatee_id: evaluateeId, evaluator_id: evaluatorId };
  const [items, feedback] = await Promise.all([
    db('evaluation_results').where(where).select('indicator_id', 'score', 'value_yes_no', 'notes', 'status', 'updated_at'),
    db('evaluation_feedback').where(where).first(),
  ]);
  res.json({ success: true, period, status: statusOf(items), comment: feedback?.comment || '', data: items });
});

// PUT /api/results  body: { period_id, evaluatee_id, items, comment, submit }  (กรรมการ)
exports.saveResults = ah(async (req, res) => {
  const period = await assertPeriodOpen(req.body?.period_id);
  const evaluateeId = toId(req.body?.evaluatee_id);
  const where = { period_id: period.id, evaluatee_id: evaluateeId, evaluator_id: req.user.id };
  if (!evaluateeId || !(await isAssigned(where))) throw httpError(403, 'ไม่ได้รับมอบหมายให้ประเมินบุคลากรท่านนี้');
  if (statusOf(await db('evaluation_results').where(where)) === 'submitted') {
    throw httpError(409, 'ส่งผลการประเมินแล้ว หากต้องการแก้ไขกรุณาติดต่อผู้ดูแลระบบ');
  }

  const submit = !!req.body?.submit;
  const rows = await validateItems(req.body?.items, { requireAll: submit });
  const status = submit ? 'submitted' : 'draft';
  const comment = req.body?.comment ? String(req.body.comment).trim().slice(0, 5000) : null;

  await db.transaction(async (trx) => {
    await trx('evaluation_results').where(where).del();
    if (rows.size) await trx('evaluation_results').insert([...rows.values()].map((r) => ({ ...r, ...where, status })));
    await trx('evaluation_feedback').insert({ ...where, comment }).onConflict(['period_id', 'evaluatee_id', 'evaluator_id']).merge({ comment });
  });
  res.json({ success: true, status: rows.size ? status : 'none', message: submit ? 'ส่งผลการประเมินเรียบร้อย' : 'บันทึกร่างเรียบร้อย' });
});

// POST /api/results/reopen  body: { period_id, evaluatee_id, evaluator_id }  (admin)
exports.reopenResults = ah(async (req, res) => {
  const period = await resolvePeriod(req.body?.period_id);
  const n = await db('evaluation_results')
    .where({ period_id: period.id, evaluatee_id: toId(req.body?.evaluatee_id), evaluator_id: toId(req.body?.evaluator_id) })
    .update({ status: 'draft' });
  if (!n) throw httpError(404, 'ไม่พบผลการประเมิน');
  res.json({ success: true });
});
