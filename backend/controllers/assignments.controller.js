// controllers/assignments.controller.js
// การจับคู่กรรมการ (evaluator) กับครูผู้รับการประเมิน (evaluatee) ในแต่ละรอบ
const db = require('../db/knex');
const { ah, httpError, toId, resolvePeriod } = require('../utils/authz');
const { summarize, statusOf } = require('../utils/progress');

// GET /api/assignments?period_id=  (admin)
exports.list = ah(async (req, res) => {
  const period = await resolvePeriod(req.query.period_id);
  const rows = await db('assignments as a')
    .join('users as er', 'er.id', 'a.evaluator_id')
    .join('users as ee', 'ee.id', 'a.evaluatee_id')
    .leftJoin('departments as d', 'd.id', 'ee.department_id')
    .where('a.period_id', period.id)
    .select(
      'a.id', 'a.period_id', 'a.evaluator_id', 'a.evaluatee_id', 'a.created_at',
      'er.name_th as evaluator_name', 'er.email as evaluator_email',
      'ee.name_th as evaluatee_name', 'ee.email as evaluatee_email', 'd.name_th as department_name'
    )
    .orderBy(['er.name_th', 'ee.name_th']);

  const results = await db('evaluation_results').where({ period_id: period.id })
    .select('evaluator_id', 'evaluatee_id', 'status');
  for (const r of rows) {
    r.status = statusOf(results.filter((x) => x.evaluator_id === r.evaluator_id && x.evaluatee_id === r.evaluatee_id));
  }
  res.json({ success: true, period, data: rows });
});

// POST /api/assignments  body: { period_id, evaluator_id, evaluatee_ids: [..] }  (admin)
exports.create = ah(async (req, res) => {
  const period = await resolvePeriod(req.body?.period_id);
  const evaluatorId = toId(req.body?.evaluator_id);
  const ids = [...new Set([].concat(req.body?.evaluatee_ids ?? req.body?.evaluatee_id ?? []).map(toId).filter(Boolean))];
  if (!evaluatorId) throw httpError(422, 'กรุณาเลือกกรรมการ');
  if (!ids.length) throw httpError(422, 'กรุณาเลือกครูผู้รับการประเมินอย่างน้อย 1 คน');
  if (ids.includes(evaluatorId)) throw httpError(422, 'กรรมการประเมินตัวเองไม่ได้');

  const evaluator = await db('users').where({ id: evaluatorId, role: 'evaluator', status: 'active' }).first();
  if (!evaluator) throw httpError(422, 'ผู้ใช้ที่เลือกไม่ใช่กรรมการที่เปิดใช้งาน');
  const evaluatees = await db('users').whereIn('id', ids).where({ role: 'evaluatee' }).select('id', 'department_id');
  if (evaluatees.length !== ids.length) throw httpError(422, 'มีผู้ใช้ที่เลือกไม่ใช่ครูผู้รับการประเมิน');

  const rows = evaluatees.map((e) => ({
    period_id: period.id, evaluator_id: evaluatorId, evaluatee_id: e.id, dept_id: e.department_id,
  }));
  const before = await db('assignments').where({ period_id: period.id, evaluator_id: evaluatorId }).whereIn('evaluatee_id', ids).count({ n: '*' });
  await db('assignments').insert(rows).onConflict(['period_id', 'evaluator_id', 'evaluatee_id']).ignore();
  const added = rows.length - Number(before[0].n);
  res.status(201).json({ success: true, added, skipped: rows.length - added });
});

// DELETE /api/assignments/:id?force=1  (admin)
// ถ้ากรรมการเริ่มให้คะแนนแล้ว ต้องส่ง force=1 เพื่อยืนยันลบผลคะแนนของคู่นี้ด้วย
exports.remove = ah(async (req, res) => {
  const a = await db('assignments').where({ id: toId(req.params.id) }).first();
  if (!a) throw httpError(404, 'ไม่พบการจับคู่');
  const pair = { period_id: a.period_id, evaluator_id: a.evaluator_id, evaluatee_id: a.evaluatee_id };
  const hasResults = await db('evaluation_results').where(pair).first();
  if (hasResults && req.query.force !== '1') {
    throw httpError(409, 'กรรมการเริ่มให้คะแนนแล้ว หากลบจะลบผลคะแนนของคู่นี้ด้วย');
  }
  await db.transaction(async (trx) => {
    await trx('evaluation_results').where(pair).del();
    await trx('evaluation_feedback').where(pair).del();
    await trx('assignments').where({ id: a.id }).del();
  });
  res.json({ success: true });
});

// GET /api/assignments/mine?period_id=  (evaluator) — รายชื่อครูที่ต้องประเมิน พร้อมความคืบหน้า
exports.mine = ah(async (req, res) => {
  const period = await resolvePeriod(req.query.period_id);
  const pairs = await db('assignments').where({ period_id: period.id, evaluator_id: req.user.id })
    .select('evaluator_id', 'evaluatee_id');
  const rows = await summarize(period.id, pairs);
  for (const r of rows) {
    const mine = r.evaluators.find((e) => e.id === req.user.id);
    r.my_status = mine?.status || 'none';
    r.my_scored = mine?.scored || 0;
  }
  res.json({ success: true, period, data: rows.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th')) });
});
