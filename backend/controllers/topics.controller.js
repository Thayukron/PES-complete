// controllers/topics.controller.js
// ด้านการประเมิน (topics) + ตัวชี้วัด (indicators) + ประเภทหลักฐานที่ใช้ได้ของแต่ละตัวชี้วัด
const db = require('../db/knex');
const { ah, httpError, toId, isAdmin } = require('../utils/authz');
const { ALLOWED, MAX_MB } = require('../middlewares/upload');

const TYPES = ['score_1_4', 'yes_no', 'file_url'];

/**
 * โหลดโครงสร้างด้าน -> ตัวชี้วัด -> ประเภทหลักฐาน (ใช้ซ้ำใน controller อื่น)
 * activeOnly = true: เฉพาะด้าน/ตัวชี้วัดที่เปิดใช้งาน
 */
async function loadTopics({ activeOnly = true } = {}) {
  const tq = db('evaluation_topics').orderBy('code');
  const iq = db('indicators').orderBy('id'); // เรียงตามลำดับที่สร้าง (ตรงกับลำดับในเกณฑ์)
  if (activeOnly) { tq.where({ active: 1 }); iq.where({ active: 1 }); }
  const [topics, indicators, maps] = await Promise.all([
    tq,
    iq,
    db('indicator_evidence as ie')
      .join('evidence_types as et', 'et.id', 'ie.evidence_type_id')
      .select('ie.indicator_id', 'et.id', 'et.code', 'et.name_th'),
  ]);
  return topics.map((t) => ({
    ...t,
    weight: Number(t.weight),
    pa_weight: Number(t.pa_weight),
    indicators: indicators
      .filter((i) => i.topic_id === t.id)
      .map((i) => ({
        ...i,
        weight: Number(i.weight),
        evidence_types: maps.filter((m) => m.indicator_id === i.id).map(({ indicator_id, ...m }) => m),
      })),
  }));
}
exports.loadTopics = loadTopics;

// GET /api/topics  (ทุกบทบาท; admin ส่ง ?all=1 เพื่อดูรายการที่ปิดใช้งานด้วย)
exports.list = ah(async (req, res) => {
  const activeOnly = !(isAdmin(req.user) && req.query.all === '1');
  res.json({ success: true, data: await loadTopics({ activeOnly }) });
});

// GET /api/indicators  (รายการตัวชี้วัดแบบแบน ใช้ใน dropdown)
exports.indicators = ah(async (req, res) => {
  const rows = await db('indicators as i')
    .join('evaluation_topics as t', 't.id', 'i.topic_id')
    .where({ 'i.active': 1, 't.active': 1 })
    .select('i.id', 'i.code', 'i.name_th', 'i.type', 'i.topic_id', 't.title_th as topic_title')
    .orderBy('i.id');
  res.json(rows);
});

// GET /api/indicators/:id/evidence-types
exports.indicatorEvidenceTypes = ah(async (req, res) => {
  const rows = await db('indicator_evidence as ie')
    .join('evidence_types as et', 'et.id', 'ie.evidence_type_id')
    .where('ie.indicator_id', toId(req.params.id))
    .select('et.id', 'et.code', 'et.name_th');
  const mime_list = Object.keys(ALLOWED);
  res.json(rows.map((r) => ({ ...r, mime_list, max_mb: MAX_MB })));
});

// ---------- Topics (admin) ----------
function pickTopic(b) {
  const data = {
    code: String(b.code || '').trim(),
    title_th: String(b.title_th || '').trim(),
    description: b.description ? String(b.description).trim() : null,
    weight: Number(b.weight ?? 0),
    pa_weight: Number(b.pa_weight ?? 0),
    active: b.active === undefined ? 1 : (b.active ? 1 : 0),
  };
  if (!data.code) throw httpError(422, 'กรุณากรอกรหัสด้าน');
  if (!data.title_th) throw httpError(422, 'กรุณากรอกชื่อด้าน');
  if (!(data.weight >= 0 && data.weight <= 100)) throw httpError(422, 'น้ำหนักไม่ถูกต้อง');
  if (!(data.pa_weight >= 0 && data.pa_weight <= 100)) throw httpError(422, 'น้ำหนัก PA ไม่ถูกต้อง');
  return data;
}

exports.createTopic = ah(async (req, res) => {
  const [id] = await db('evaluation_topics').insert(pickTopic(req.body || {}));
  res.status(201).json({ success: true, data: await db('evaluation_topics').where({ id }).first() });
});

exports.updateTopic = ah(async (req, res) => {
  const id = toId(req.params.id);
  if (!(await db('evaluation_topics').where({ id }).first())) throw httpError(404, 'ไม่พบด้านการประเมิน');
  await db('evaluation_topics').where({ id }).update(pickTopic(req.body || {}));
  res.json({ success: true, data: await db('evaluation_topics').where({ id }).first() });
});

exports.removeTopic = ah(async (req, res) => {
  const id = toId(req.params.id);
  if (await db('evaluation_results').where({ topic_id: id }).first()) {
    throw httpError(409, 'ด้านนี้มีผลการประเมินแล้ว ไม่สามารถลบได้ (ปิดใช้งานแทนได้)');
  }
  const n = await db('evaluation_topics').where({ id }).del();
  if (!n) throw httpError(404, 'ไม่พบด้านการประเมิน');
  res.json({ success: true });
});

// ---------- Indicators (admin) ----------
async function pickIndicator(b) {
  const data = {
    topic_id: toId(b.topic_id),
    code: String(b.code || '').trim(),
    name_th: String(b.name_th || '').trim(),
    description: b.description ? String(b.description).trim() : null,
    type: b.type,
    weight: Number(b.weight ?? 1),
    min_score: Number(b.min_score ?? 1),
    max_score: Number(b.max_score ?? 4),
    active: b.active === undefined ? 1 : (b.active ? 1 : 0),
  };
  if (!data.topic_id || !(await db('evaluation_topics').where({ id: data.topic_id }).first())) {
    throw httpError(422, 'กรุณาเลือกด้านการประเมิน');
  }
  if (!data.code) throw httpError(422, 'กรุณากรอกรหัสตัวชี้วัด');
  if (!data.name_th) throw httpError(422, 'กรุณากรอกชื่อตัวชี้วัด');
  if (!TYPES.includes(data.type)) throw httpError(422, 'ประเภทตัวชี้วัดไม่ถูกต้อง');
  if (!(data.weight > 0)) throw httpError(422, 'น้ำหนักต้องมากกว่า 0');
  if (!(data.min_score >= 0 && data.max_score > data.min_score && data.max_score <= 100)) {
    throw httpError(422, 'ช่วงคะแนนไม่ถูกต้อง');
  }
  return data;
}

async function setEvidenceTypes(trx, indicatorId, ids) {
  if (!Array.isArray(ids)) return;
  await trx('indicator_evidence').where({ indicator_id: indicatorId }).del();
  const clean = [...new Set(ids.map(toId).filter(Boolean))];
  if (clean.length) {
    await trx('indicator_evidence').insert(clean.map((evidence_type_id) => ({ indicator_id: indicatorId, evidence_type_id })));
  }
}

exports.createIndicator = ah(async (req, res) => {
  const data = await pickIndicator(req.body || {});
  const id = await db.transaction(async (trx) => {
    const [newId] = await trx('indicators').insert(data);
    await setEvidenceTypes(trx, newId, req.body.evidence_type_ids);
    return newId;
  });
  res.status(201).json({ success: true, data: await db('indicators').where({ id }).first() });
});

exports.updateIndicator = ah(async (req, res) => {
  const id = toId(req.params.id);
  if (!(await db('indicators').where({ id }).first())) throw httpError(404, 'ไม่พบตัวชี้วัด');
  const data = await pickIndicator(req.body || {});
  await db.transaction(async (trx) => {
    await trx('indicators').where({ id }).update(data);
    await setEvidenceTypes(trx, id, req.body.evidence_type_ids);
  });
  res.json({ success: true, data: await db('indicators').where({ id }).first() });
});

exports.removeIndicator = ah(async (req, res) => {
  const id = toId(req.params.id);
  if (await db('evaluation_results').where({ indicator_id: id }).first()
    || await db('attachments').where({ indicator_id: id }).first()) {
    throw httpError(409, 'ตัวชี้วัดนี้มีหลักฐานหรือผลการประเมินแล้ว ไม่สามารถลบได้ (ปิดใช้งานแทนได้)');
  }
  const n = await db('indicators').where({ id }).del();
  if (!n) throw httpError(404, 'ไม่พบตัวชี้วัด');
  res.json({ success: true });
});
