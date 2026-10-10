// utils/authz.js
// ตัวช่วยตรวจสิทธิ์ที่ใช้ร่วมกันหลาย controller
const db = require('../db/knex');

exports.isAdmin = (u) => u?.role === 'admin';
exports.isEvaluator = (u) => u?.role === 'evaluator';
exports.isEvaluatee = (u) => u?.role === 'evaluatee';

// ห่อ async handler ให้ส่ง error เข้า error middleware อัตโนมัติ (ไม่ต้อง try/catch ทุกฟังก์ชัน)
exports.ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// สร้าง error พร้อม HTTP status
exports.httpError = (status, message) => Object.assign(new Error(message), { status });

// หา period ที่จะใช้: ถ้าส่ง period_id มาใช้ตัวนั้น ไม่งั้นใช้รอบที่เปิดอยู่ล่าสุด
exports.resolvePeriod = async (periodId) => {
  const q = db('evaluation_periods');
  const period = periodId
    ? await q.where({ id: Number(periodId) }).first()
    : await q.where({ is_active: 1 }).orderBy('id', 'desc').first();
  if (!period) throw exports.httpError(404, 'ไม่พบรอบการประเมิน');
  return period;
};

// กรรมการคนนี้ได้รับมอบหมายให้ประเมินครูคนนี้ในรอบนี้หรือไม่
exports.isAssigned = async ({ period_id, evaluator_id, evaluatee_id }) =>
  !!(await db('assignments').where({ period_id, evaluator_id, evaluatee_id }).first());

// ผู้ใช้คนนี้ดูข้อมูลการประเมินของครู evaluateeId ในรอบนี้ได้หรือไม่
//  - admin: ได้ทุกคน
//  - evaluatee: ได้เฉพาะของตัวเอง
//  - evaluator: ได้เฉพาะครูที่ได้รับมอบหมาย
exports.canViewEvaluatee = async (user, periodId, evaluateeId) => {
  if (exports.isAdmin(user)) return true;
  if (exports.isEvaluatee(user)) return Number(user.id) === Number(evaluateeId);
  if (exports.isEvaluator(user)) {
    return exports.isAssigned({ period_id: periodId, evaluator_id: user.id, evaluatee_id: evaluateeId });
  }
  return false;
};

exports.assertCanView = async (user, periodId, evaluateeId) => {
  if (!(await exports.canViewEvaluatee(user, periodId, evaluateeId))) {
    throw exports.httpError(403, 'ไม่มีสิทธิ์ดูข้อมูลของบุคลากรท่านนี้');
  }
};

// แปลงค่าที่ส่งมาเป็นตัวเลข id (ไม่ถูกต้องคืน null)
exports.toId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
