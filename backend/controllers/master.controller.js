// controllers/master.controller.js
// ข้อมูลพื้นฐาน: แผนกวิชา, ฝ่าย, ประเภทหลักฐาน, ประเภทวิชา
const db = require('../db/knex');
const { ah, httpError, toId } = require('../utils/authz');

// GET /api/lookups  (ทุกบทบาทที่ล็อกอิน) — ใช้เติม dropdown ในหน้าเว็บ
exports.lookups = ah(async (req, res) => {
  const [departments, org_groups, evidence_types, vocational_categories] = await Promise.all([
    db('departments as d')
      .leftJoin('vocational_categories as c', 'c.id', 'd.category_id')
      .leftJoin('org_groups as g', 'g.id', 'd.org_group_id')
      .select('d.*', 'c.name_th as category_name', 'g.name_th as org_group_name')
      .orderBy('d.name_th'),
    db('org_groups').orderBy('id'),
    db('evidence_types').orderBy('code'),
    db('vocational_categories').select('id', 'code', 'name_th').orderBy('code'),
  ]);
  res.json({ success: true, data: { departments, org_groups, evidence_types, vocational_categories } });
});

// ---------- CRUD แบบทั่วไปสำหรับตารางข้อมูลพื้นฐาน (admin) ----------
function crud(table, fields, label) {
  const pick = (body) => {
    const data = {};
    for (const [key, rule] of Object.entries(fields)) {
      let v = body[key];
      if (rule === 'id') v = toId(v);
      else if (typeof v === 'string') v = v.trim();
      if (fields[key] !== 'optional' && (v === undefined || v === null || v === '')) {
        throw httpError(422, `กรุณากรอก ${key}`);
      }
      data[key] = v === '' ? null : v ?? null;
    }
    return data;
  };
  return {
    create: ah(async (req, res) => {
      const [id] = await db(table).insert(pick(req.body || {}));
      res.status(201).json({ success: true, data: await db(table).where({ id }).first() });
    }),
    update: ah(async (req, res) => {
      const id = toId(req.params.id);
      if (!(await db(table).where({ id }).first())) throw httpError(404, `ไม่พบ${label}`);
      await db(table).where({ id }).update(pick(req.body || {}));
      res.json({ success: true, data: await db(table).where({ id }).first() });
    }),
    remove: ah(async (req, res) => {
      const n = await db(table).where({ id: toId(req.params.id) }).del();
      if (!n) throw httpError(404, `ไม่พบ${label}`);
      res.json({ success: true });
    }),
  };
}

exports.departments = crud('departments', { code: 'required', name_th: 'required', category_id: 'id', org_group_id: 'id' }, 'แผนกวิชา');
exports.orgGroups = crud('org_groups', { code: 'required', name_th: 'required' }, 'ฝ่าย');
exports.evidenceTypes = crud('evidence_types', { code: 'required', name_th: 'required', description: 'optional' }, 'ประเภทหลักฐาน');
