// controllers/reports.controller.js
// รายงานผลการประเมิน + ข้อมูลหน้าแดชบอร์ด
const db = require('../db/knex');
const { ah, httpError, toId, resolvePeriod, assertCanView, isAdmin, isEvaluator, isEvaluatee } = require('../utils/authz');
const { loadTopics } = require('./topics.controller');
const { summarize, statusOf } = require('../utils/progress');
const { computeTotals, averageValues, indicatorPercent } = require('../utils/scoring');

// คู่กรรมการ-ครู ที่ผู้ใช้คนนี้มองเห็น
function visiblePairs(user, periodId) {
  const q = db('assignments').where({ period_id: periodId }).select('evaluator_id', 'evaluatee_id');
  if (isEvaluator(user)) q.where({ evaluator_id: user.id });
  if (isEvaluatee(user)) q.where({ evaluatee_id: user.id });
  return q;
}

// GET /api/reports/summary?period_id=&department_id=   (admin: ทุกคน, กรรมการ: เฉพาะที่รับผิดชอบ)
exports.summary = ah(async (req, res) => {
  const period = await resolvePeriod(req.query.period_id);
  let rows = await summarize(period.id, await visiblePairs(req.user, period.id));
  if (toId(req.query.department_id)) rows = rows.filter((r) => r.department_id === toId(req.query.department_id));
  rows.sort((a, b) => (a.department_name || '').localeCompare(b.department_name || '', 'th') || a.name_th.localeCompare(b.name_th, 'th'));
  res.json({ success: true, period, data: rows });
});

/**
 * GET /api/reports/evaluatee/:id?period_id=
 * รายงานรายบุคคล: ทุกด้าน/ตัวชี้วัด พร้อมหลักฐาน คะแนนตนเอง คะแนนกรรมการ (เฉพาะที่ส่งแล้ว) และข้อเสนอแนะ
 */
exports.evaluatee = ah(async (req, res) => {
  const period = await resolvePeriod(req.query.period_id);
  const evaluateeId = toId(req.params.id);
  await assertCanView(req.user, period.id, evaluateeId);

  const evaluatee = await db('users as u')
    .leftJoin('departments as d', 'd.id', 'u.department_id')
    .leftJoin('org_groups as g', 'g.id', 'u.org_group_id')
    .where('u.id', evaluateeId)
    .select('u.id', 'u.name_th', 'u.email', 'd.name_th as department_name', 'g.name_th as org_group_name')
    .first();
  if (!evaluatee) throw httpError(404, 'ไม่พบบุคลากร');

  const where = { period_id: period.id, evaluatee_id: evaluateeId };
  const [topics, files, selfRows, results, feedback, assigned] = await Promise.all([
    loadTopics(),
    db('attachments').where(where).select('id', 'indicator_id', 'file_name', 'mime_type', 'size_bytes', 'note', 'created_at'),
    db('self_assessments').where(where),
    db('evaluation_results as r').join('users as u', 'u.id', 'r.evaluator_id').where({ 'r.period_id': period.id, 'r.evaluatee_id': evaluateeId })
      .select('r.*', 'u.name_th as evaluator_name'),
    db('evaluation_feedback as f').join('users as u', 'u.id', 'f.evaluator_id').where({ 'f.period_id': period.id, 'f.evaluatee_id': evaluateeId })
      .select('f.evaluator_id', 'f.comment', 'f.updated_at', 'u.name_th as evaluator_name'),
    db('assignments as a').join('users as u', 'u.id', 'a.evaluator_id').where({ 'a.period_id': period.id, 'a.evaluatee_id': evaluateeId })
      .select('a.evaluator_id', 'u.name_th as evaluator_name'),
  ]);

  const submitted = results.filter((r) => r.status === 'submitted');
  const submittedBy = new Set(submitted.map((r) => r.evaluator_id));
  const selfByInd = Object.fromEntries(selfRows.map((r) => [r.indicator_id, r]));
  const finalValues = {};

  const outTopics = topics.map((t) => ({
    id: t.id, code: t.code, title_th: t.title_th, weight: t.weight,
    indicators: t.indicators.map((i) => {
      const evals = submitted.filter((r) => r.indicator_id === i.id);
      const final = averageValues(evals);
      if (final) finalValues[i.id] = final;
      const self = selfByInd[i.id] || null;
      return {
        id: i.id, code: i.code, name_th: i.name_th, description: i.description, type: i.type,
        min_score: i.min_score, max_score: i.max_score, weight: i.weight,
        files: files.filter((f) => f.indicator_id === i.id),
        self: self && { score: self.score, value_yes_no: self.value_yes_no, notes: self.notes, percent: indicatorPercent(i, self) },
        evaluators: evals.map((r) => ({ evaluator_id: r.evaluator_id, evaluator_name: r.evaluator_name, score: r.score, value_yes_no: r.value_yes_no, notes: r.notes })),
        final: final && { ...final, percent: indicatorPercent(i, final) },
      };
    }),
  }));

  const totals = computeTotals(topics, finalValues);
  const selfTotals = computeTotals(topics, selfByInd);
  for (const t of outTopics) {
    t.percent = totals.topics.find((x) => x.id === t.id)?.percent ?? null;
    t.self_percent = selfTotals.topics.find((x) => x.id === t.id)?.percent ?? null;
  }

  res.json({
    success: true,
    data: {
      period,
      evaluatee,
      topics: outTopics,
      totals: { percent: totals.percent, level: totals.level, scored: totals.scored, total: totals.total },
      self_totals: { percent: selfTotals.percent, level: selfTotals.level },
      self_status: statusOf(selfRows),
      evaluators: assigned.map((a) => ({
        id: a.evaluator_id,
        name: a.evaluator_name,
        status: statusOf(results.filter((r) => r.evaluator_id === a.evaluator_id)),
      })),
      // ครูเห็นข้อเสนอแนะเฉพาะจากกรรมการที่ส่งผลแล้ว
      feedback: feedback.filter((f) => f.comment && (!isEvaluatee(req.user) || submittedBy.has(f.evaluator_id))),
      completed: assigned.length > 0 && assigned.every((a) => submittedBy.has(a.evaluator_id)),
    },
  });
});

// GET /api/dashboard?period_id=  — ตัวเลขสรุปตามบทบาท
exports.dashboard = ah(async (req, res) => {
  const period = await db('evaluation_periods').where(toId(req.query.period_id) ? { id: toId(req.query.period_id) } : { is_active: 1 })
    .orderBy('id', 'desc').first();
  const data = { period: period || null };

  if (isAdmin(req.user)) {
    const roleCounts = await db('users').select('role').count({ n: '*' }).where({ status: 'active' }).groupBy('role');
    data.users = Object.fromEntries(roleCounts.map((r) => [r.role, Number(r.n)]));
    data.disabled_users = Number((await db('users').where({ status: 'disabled' }).count({ n: '*' }))[0].n);
    data.indicators = Number((await db('indicators').where({ active: 1 }).count({ n: '*' }))[0].n);
  }

  if (period) {
    const rows = await summarize(period.id, await visiblePairs(req.user, period.id));
    data.evaluatees = rows.length;
    data.completed = rows.filter((r) => r.evaluators.length && r.evaluators_submitted === r.evaluators.length).length;
    data.self_submitted = rows.filter((r) => r.self_status === 'submitted').length;
    data.files = rows.reduce((s, r) => s + r.files_count, 0);
    if (isEvaluator(req.user)) {
      const mine = rows.map((r) => r.evaluators.find((e) => e.id === req.user.id)?.status || 'none');
      data.my = { total: mine.length, submitted: mine.filter((s) => s === 'submitted').length, draft: mine.filter((s) => s === 'draft').length };
    }
    if (isEvaluatee(req.user)) data.me = rows[0] || null;
    if (!isEvaluatee(req.user)) {
      data.recent = await db('attachments as a').join('users as u', 'u.id', 'a.evaluatee_id')
        .join('indicators as i', 'i.id', 'a.indicator_id')
        .where('a.period_id', period.id)
        .whereIn('a.evaluatee_id', rows.map((r) => r.evaluatee_id).concat([0]))
        .select('a.id', 'a.file_name', 'a.created_at', 'u.name_th as evaluatee_name', 'i.code as indicator_code')
        .orderBy('a.id', 'desc').limit(5);
    }
  }
  res.json({ success: true, data });
});
