// controllers/auth.controller.js
// ล็อกอิน / ข้อมูลตัวเอง / แก้ไขโปรไฟล์ / เปลี่ยนรหัสผ่าน
const db = require('../db/knex');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { ah, httpError } = require('../utils/authz');

// ข้อมูลผู้ใช้ที่ส่งออกได้ (ห้ามส่ง password_hash)
const publicUser = (u) => u && {
  id: u.id,
  name: u.name_th,
  email: u.email,
  role: u.role,
  status: u.status,
  department_id: u.department_id,
  department_name: u.department_name || null,
  org_group_id: u.org_group_id,
  org_group_name: u.org_group_name || null,
};

const findUser = (where) =>
  db('users as u')
    .leftJoin('departments as d', 'd.id', 'u.department_id')
    .leftJoin('org_groups as g', 'g.id', 'u.org_group_id')
    .select('u.*', 'd.name_th as department_name', 'g.name_th as org_group_name')
    .where(where)
    .first();

/**
 * POST /api/auth/login  body: { email, password }
 * 200: { success, accessToken, user }
 */
exports.login = ah(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  const user = await findUser({ 'u.email': String(email).trim().toLowerCase() });
  // ใช้ข้อความเดียวกันทั้งกรณีไม่พบอีเมลและรหัสผิด เพื่อไม่บอกใบ้ว่าอีเมลนี้มีในระบบ
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
    return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ success: false, message: 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name_th },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '8h' }
  );
  res.json({ success: true, accessToken: token, user: publicUser(user) });
});

// GET /api/auth/me
exports.me = ah(async (req, res) => {
  const user = await findUser({ 'u.id': req.user.id });
  if (!user || user.status !== 'active') throw httpError(401, 'บัญชีไม่พร้อมใช้งาน');
  res.json({ success: true, data: publicUser(user) });
});

// PUT /api/auth/me  body: { name_th }
exports.updateMe = ah(async (req, res) => {
  const name = String(req.body?.name_th || '').trim();
  if (!name) throw httpError(422, 'กรุณากรอกชื่อ-นามสกุล');
  await db('users').where({ id: req.user.id }).update({ name_th: name });
  res.json({ success: true, data: publicUser(await findUser({ 'u.id': req.user.id })) });
});

// PUT /api/auth/password  body: { current_password, new_password }
exports.changePassword = ah(async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) throw httpError(422, 'กรุณากรอกรหัสผ่านให้ครบ');
  if (String(new_password).length < 8) throw httpError(422, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');

  const user = await db('users').where({ id: req.user.id }).first();
  if (!(await bcrypt.compare(String(current_password), user.password_hash))) {
    throw httpError(422, 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
  }
  const password_hash = await bcrypt.hash(String(new_password), 10);
  await db('users').where({ id: req.user.id }).update({ password_hash });
  res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อย' });
});

exports.publicUser = publicUser;
