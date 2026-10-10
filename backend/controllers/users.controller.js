// controllers/users.controller.js
// จัดการผู้ใช้ (เฉพาะ admin): ค้นหา/แบ่งหน้า เพิ่ม แก้ไข ลบ รีเซ็ตรหัสผ่าน
const db = require('../db/knex');
const bcrypt = require('bcrypt');
const { ah, httpError, toId } = require('../utils/authz');

const ROLES = ['admin', 'evaluator', 'evaluatee'];
const STATUSES = ['active', 'disabled'];
const SORTABLE = { id: 'u.id', name_th: 'u.name_th', email: 'u.email', role: 'u.role', status: 'u.status', department_name: 'd.name_th', created_at: 'u.created_at' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const baseQuery = () =>
  db('users as u')
    .leftJoin('departments as d', 'd.id', 'u.department_id')
    .leftJoin('org_groups as g', 'g.id', 'u.org_group_id');

const COLUMNS = [
  'u.id', 'u.email', 'u.name_th', 'u.role', 'u.status', 'u.department_id', 'u.org_group_id',
  'u.created_at', 'u.updated_at', 'd.name_th as department_name', 'g.name_th as org_group_name',
];

function applyFilters(q, { search, role, status, department_id }) {
  if (search) {
    const s = `%${search}%`;
    q.where((w) => w.where('u.name_th', 'like', s).orWhere('u.email', 'like', s));
  }
  if (role && ROLES.includes(role)) q.where('u.role', role);
  if (status && STATUSES.includes(status)) q.where('u.status', status);
  if (toId(department_id)) q.where('u.department_id', toId(department_id));
  return q;
}

/**
 * GET /api/users?page=1&itemsPerPage=10&search=&role=&status=&department_id=&sortBy=id&sortDesc=true
 * itemsPerPage=-1 คืนทั้งหมด (ใช้ในหน้าจับคู่กรรมการ)
 */
exports.list = ah(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Number(req.query.itemsPerPage) === -1 ? -1 : Math.min(200, Math.max(1, Number(req.query.itemsPerPage) || 10));
  const sortCol = SORTABLE[req.query.sortBy] || 'u.id';
  const sortDir = String(req.query.sortDesc) === 'false' ? 'asc' : 'desc';

  const [{ total }] = await applyFilters(baseQuery(), req.query).count({ total: 'u.id' });
  const q = applyFilters(baseQuery(), req.query).select(COLUMNS).orderBy(sortCol, sortDir);
  if (perPage !== -1) q.limit(perPage).offset((page - 1) * perPage);

  res.json({ success: true, items: await q, total: Number(total), page, itemsPerPage: perPage });
});

// GET /api/users/:id
exports.get = ah(async (req, res) => {
  const row = await baseQuery().select(COLUMNS).where('u.id', toId(req.params.id)).first();
  if (!row) throw httpError(404, 'ไม่พบผู้ใช้');
  res.json({ success: true, data: row });
});

// ตรวจและเตรียมข้อมูลสำหรับบันทึก (isCreate = ต้องมีรหัสผ่าน)
async function buildPayload(body, isCreate) {
  const data = {};
  if (isCreate || body.email !== undefined) {
    const email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw httpError(422, 'รูปแบบอีเมลไม่ถูกต้อง');
    data.email = email;
  }
  if (isCreate || body.name_th !== undefined) {
    const name = String(body.name_th || '').trim();
    if (!name) throw httpError(422, 'กรุณากรอกชื่อ-นามสกุล');
    data.name_th = name;
  }
  if (isCreate || body.role !== undefined) {
    if (!ROLES.includes(body.role)) throw httpError(422, 'บทบาทไม่ถูกต้อง');
    data.role = body.role;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw httpError(422, 'สถานะไม่ถูกต้อง');
    data.status = body.status;
  }
  if (body.department_id !== undefined) data.department_id = toId(body.department_id);
  if (body.org_group_id !== undefined) data.org_group_id = toId(body.org_group_id);
  if (isCreate || body.password) {
    if (String(body.password || '').length < 8) throw httpError(422, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    data.password_hash = await bcrypt.hash(String(body.password), 10);
  }
  return data;
}

// POST /api/users
exports.create = ah(async (req, res) => {
  const data = await buildPayload(req.body || {}, true);
  if (await db('users').where({ email: data.email }).first()) throw httpError(409, 'อีเมลนี้มีในระบบแล้ว');
  const [id] = await db('users').insert(data);
  const row = await baseQuery().select(COLUMNS).where('u.id', id).first();
  res.status(201).json({ success: true, data: row });
});

// PUT /api/users/:id  (ส่ง password มาด้วย = รีเซ็ตรหัสผ่าน)
exports.update = ah(async (req, res) => {
  const id = toId(req.params.id);
  const current = await db('users').where({ id }).first();
  if (!current) throw httpError(404, 'ไม่พบผู้ใช้');

  const data = await buildPayload(req.body || {}, false);
  if (id === req.user.id) {
    // กันผู้ดูแลระบบล็อกตัวเองออกจากระบบ
    if (data.role && data.role !== 'admin') throw httpError(422, 'ไม่สามารถเปลี่ยนบทบาทของตัวเองได้');
    if (data.status === 'disabled') throw httpError(422, 'ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้');
  }
  if (data.email && data.email !== current.email && (await db('users').where({ email: data.email }).first())) {
    throw httpError(409, 'อีเมลนี้มีในระบบแล้ว');
  }
  if (Object.keys(data).length) await db('users').where({ id }).update(data);
  const row = await baseQuery().select(COLUMNS).where('u.id', id).first();
  res.json({ success: true, data: row });
});

// DELETE /api/users/:id  (ลบได้เฉพาะผู้ใช้ที่ยังไม่มีข้อมูลการประเมิน ไม่งั้นให้ปิดการใช้งานแทน)
exports.remove = ah(async (req, res) => {
  const id = toId(req.params.id);
  if (id === req.user.id) throw httpError(422, 'ไม่สามารถลบบัญชีของตัวเองได้');
  if (!(await db('users').where({ id }).first())) throw httpError(404, 'ไม่พบผู้ใช้');

  const linked = await db('assignments').where('evaluator_id', id).orWhere('evaluatee_id', id).first()
    || await db('evaluation_results').where('evaluator_id', id).orWhere('evaluatee_id', id).first();
  if (linked) throw httpError(409, 'ผู้ใช้นี้มีข้อมูลการประเมินแล้ว ไม่สามารถลบได้ กรุณาใช้ "ปิดการใช้งาน" แทน');

  await db('users').where({ id }).del();
  res.json({ success: true });
});
