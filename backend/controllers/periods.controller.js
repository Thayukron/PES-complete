// controllers/periods.controller.js
// รอบการประเมิน (ปีการศึกษา/ปีงบประมาณ)
const db = require('../db/knex');
const { ah, httpError, toId } = require('../utils/authz');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pick(body) {
  const data = {
    code: String(body.code || '').trim(),
    name_th: String(body.name_th || '').trim(),
    buddhist_year: Number(body.buddhist_year),
    start_date: String(body.start_date || '').slice(0, 10),
    end_date: String(body.end_date || '').slice(0, 10),
    is_active: body.is_active ? 1 : 0,
  };
  if (!data.code) throw httpError(422, 'กรุณากรอกรหัสรอบ');
  if (!data.name_th) throw httpError(422, 'กรุณากรอกชื่อรอบการประเมิน');
  if (!Number.isInteger(data.buddhist_year) || data.buddhist_year < 2500) throw httpError(422, 'ปี พ.ศ. ไม่ถูกต้อง');
  if (!DATE_RE.test(data.start_date) || !DATE_RE.test(data.end_date)) throw httpError(422, 'รูปแบบวันที่ไม่ถูกต้อง');
  if (data.end_date < data.start_date) throw httpError(422, 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
  return data;
}

// GET /api/periods  (ทุกบทบาท) — เรียงรอบล่าสุดก่อน
exports.list = ah(async (req, res) => {
  const q = db('evaluation_periods').orderBy([{ column: 'is_active', order: 'desc' }, { column: 'id', order: 'desc' }]);
  if (req.query.active === '1') q.where({ is_active: 1 });
  res.json({ success: true, data: await q });
});

// GET /api/periods/active  (คงไว้ให้หน้าเว็บเดิมใช้ได้)
exports.active = ah(async (req, res) => {
  res.json(await db('evaluation_periods').where({ is_active: 1 }).orderBy('id', 'desc'));
});

exports.create = ah(async (req, res) => {
  const [id] = await db('evaluation_periods').insert(pick(req.body || {}));
  res.status(201).json({ success: true, data: await db('evaluation_periods').where({ id }).first() });
});

exports.update = ah(async (req, res) => {
  const id = toId(req.params.id);
  if (!(await db('evaluation_periods').where({ id }).first())) throw httpError(404, 'ไม่พบรอบการประเมิน');
  await db('evaluation_periods').where({ id }).update(pick(req.body || {}));
  res.json({ success: true, data: await db('evaluation_periods').where({ id }).first() });
});

// ลบได้เฉพาะรอบที่ยังไม่มีข้อมูล (ข้อมูลในรอบจะถูกลบตาม CASCADE จึงต้องกันไว้)
exports.remove = ah(async (req, res) => {
  const id = toId(req.params.id);
  const used = await db('assignments').where({ period_id: id }).first()
    || await db('attachments').where({ period_id: id }).first()
    || await db('evaluation_results').where({ period_id: id }).first();
  if (used) throw httpError(409, 'รอบนี้มีข้อมูลการประเมินแล้ว ไม่สามารถลบได้ (ปิดรอบแทนได้)');
  const n = await db('evaluation_periods').where({ id }).del();
  if (!n) throw httpError(404, 'ไม่พบรอบการประเมิน');
  res.json({ success: true });
});
