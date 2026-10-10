// controllers/attachments.controller.js
// ไฟล์หลักฐานของครู: อัปโหลด / รายการ / ดาวน์โหลด (ตรวจสิทธิ์ทุกครั้ง) / ลบ
const fs = require('fs');
const path = require('path');
const db = require('../db/knex');
const { ah, httpError, toId, resolvePeriod, assertCanView, isAdmin, isEvaluatee } = require('../utils/authz');
const { UPLOAD_ROOT } = require('../middlewares/upload');

const removeFile = (p) => p && fs.promises.unlink(p).catch(() => {});
const absPath = (storagePath) => path.join(UPLOAD_ROOT, storagePath);

const listQuery = () =>
  db('attachments as a')
    .join('indicators as i', 'i.id', 'a.indicator_id')
    .join('evaluation_topics as t', 't.id', 'i.topic_id')
    .join('evidence_types as et', 'et.id', 'a.evidence_type_id')
    .select(
      'a.id', 'a.period_id', 'a.evaluatee_id', 'a.indicator_id', 'a.evidence_type_id',
      'a.file_name', 'a.mime_type', 'a.size_bytes', 'a.note', 'a.created_at',
      'i.code as indicator_code', 'i.name_th as indicator_name',
      't.id as topic_id', 't.title_th as topic_title', 'et.name_th as evidence_type_name'
    );

// GET /api/attachments?period_id=&evaluatee_id=  (ครูไม่ต้องส่ง evaluatee_id)
exports.list = ah(async (req, res) => {
  const period = await resolvePeriod(req.query.period_id);
  const evaluateeId = isEvaluatee(req.user) ? req.user.id : toId(req.query.evaluatee_id);
  if (!evaluateeId) throw httpError(422, 'กรุณาระบุครูผู้รับการประเมิน');
  await assertCanView(req.user, period.id, evaluateeId);

  const q = listQuery().where({ 'a.period_id': period.id, 'a.evaluatee_id': evaluateeId }).orderBy('a.id', 'desc');
  if (toId(req.query.indicator_id)) q.where('a.indicator_id', toId(req.query.indicator_id));
  res.json({ success: true, period, data: await q });
});

// POST /api/attachments  (multipart: file, period_id, indicator_id, evidence_type_id, note)  — ครูอัปโหลดของตัวเอง
exports.create = ah(async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw httpError(422, 'กรุณาเลือกไฟล์หลักฐาน');
    const periodId = toId(req.body.period_id);
    const indicatorId = toId(req.body.indicator_id);
    const evidenceTypeId = toId(req.body.evidence_type_id);
    if (!periodId || !indicatorId || !evidenceTypeId) throw httpError(422, 'กรุณาเลือกรอบ ตัวชี้วัด และชนิดหลักฐานให้ครบ');

    const period = await db('evaluation_periods').where({ id: periodId }).first();
    if (!period) throw httpError(404, 'ไม่พบรอบการประเมิน');
    if (!period.is_active) throw httpError(409, 'รอบการประเมินนี้ปิดแล้ว ไม่สามารถอัปโหลดได้');

    const indicator = await db('indicators').where({ id: indicatorId, active: 1 }).first();
    if (!indicator) throw httpError(404, 'ไม่พบตัวชี้วัด');
    const allowed = await db('indicator_evidence').where({ indicator_id: indicatorId, evidence_type_id: evidenceTypeId }).first();
    if (!allowed) throw httpError(409, 'ชนิดหลักฐานนี้ไม่ตรงกับตัวชี้วัดที่เลือก');

    const assigned = await db('assignments').where({ period_id: periodId, evaluatee_id: req.user.id }).first();
    if (!assigned) throw httpError(403, 'คุณยังไม่ได้รับการกำหนดกรรมการในรอบนี้ กรุณาติดต่อผู้ดูแลระบบ');

    const [id] = await db('attachments').insert({
      period_id: periodId,
      evaluatee_id: req.user.id,
      indicator_id: indicatorId,
      evidence_type_id: evidenceTypeId,
      file_name: file.originalname.slice(0, 255),
      mime_type: file.mimetype,
      size_bytes: file.size,
      storage_path: path.relative(UPLOAD_ROOT, file.path).split(path.sep).join('/'),
      note: req.body.note ? String(req.body.note).trim().slice(0, 255) : null,
    });
    res.status(201).json({ success: true, data: await listQuery().where('a.id', id).first() });
  } catch (e) {
    await removeFile(file?.path); // ไม่ผ่านการตรวจ -> ลบไฟล์ที่ multer บันทึกไว้แล้วทิ้ง
    throw e;
  }
});

// GET /api/attachments/:id/file?inline=1  — ดาวน์โหลด/เปิดดูไฟล์ (ตรวจสิทธิ์ก่อนเสมอ)
exports.download = ah(async (req, res) => {
  const a = await db('attachments').where({ id: toId(req.params.id) }).first();
  if (!a) throw httpError(404, 'ไม่พบไฟล์');
  await assertCanView(req.user, a.period_id, a.evaluatee_id);

  const full = absPath(a.storage_path);
  if (!full.startsWith(UPLOAD_ROOT) || !fs.existsSync(full)) throw httpError(404, 'ไม่พบไฟล์บนเซิร์ฟเวอร์');

  const disposition = req.query.inline === '1' ? 'inline' : 'attachment';
  res.setHeader('Content-Type', a.mime_type);
  res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(a.file_name)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(full).pipe(res);
});

// DELETE /api/attachments/:id  — ครูลบของตัวเอง (ขณะรอบเปิดและกรรมการยังไม่ส่งผล) หรือ admin
exports.remove = ah(async (req, res) => {
  const a = await db('attachments').where({ id: toId(req.params.id) }).first();
  if (!a) throw httpError(404, 'ไม่พบไฟล์');

  if (!isAdmin(req.user)) {
    if (a.evaluatee_id !== req.user.id) throw httpError(403, 'ลบได้เฉพาะไฟล์ของตัวเอง');
    const period = await db('evaluation_periods').where({ id: a.period_id }).first();
    if (!period?.is_active) throw httpError(409, 'รอบการประเมินนี้ปิดแล้ว ไม่สามารถลบไฟล์ได้');
    const submitted = await db('evaluation_results')
      .where({ period_id: a.period_id, evaluatee_id: a.evaluatee_id, indicator_id: a.indicator_id, status: 'submitted' }).first();
    if (submitted) throw httpError(409, 'กรรมการส่งผลการประเมินตัวชี้วัดนี้แล้ว ไม่สามารถลบหลักฐานได้');
  }

  await db('attachments').where({ id: a.id }).del();
  await removeFile(absPath(a.storage_path));
  res.json({ success: true });
});
