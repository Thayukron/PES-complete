// middlewares/upload.js
// รับไฟล์หลักฐานด้วย multer: เก็บที่ uploads/<evaluatee_id>/<timestamp>_<ชื่อไฟล์>
// ต้องวางหลัง auth() เสมอ เพราะใช้ req.user.id เป็นชื่อโฟลเดอร์
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const MAX_MB = Number(process.env.UPLOAD_MAX_MB || 10);

// ชนิดไฟล์ที่อนุญาต (ตรงกับที่แสดงในหน้าอัปโหลด)
const ALLOWED = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP',
};

// multer อ่านชื่อไฟล์เป็น latin1 ต้องแปลงกลับเป็น utf8 ไม่งั้นชื่อไฟล์ภาษาไทยจะเพี้ยน
const decodeName = (name) => Buffer.from(name, 'latin1').toString('utf8');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(UPLOAD_ROOT, String(req.user.id));
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    file.originalname = decodeName(file.originalname);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED[file.mimetype]) {
    const err = new Error('ชนิดไฟล์ไม่รองรับ (รองรับ: ' + [...new Set(Object.values(ALLOWED))].join(', ') + ')');
    err.status = 400;
    return cb(err, false);
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_MB * 1024 * 1024 } });

module.exports = upload;
module.exports.UPLOAD_ROOT = UPLOAD_ROOT;
module.exports.ALLOWED = ALLOWED;
module.exports.MAX_MB = MAX_MB;
