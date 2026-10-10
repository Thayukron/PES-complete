// middlewares/error.js
// ตัวจัดการ error กลาง: แปลง error ที่พบบ่อยเป็นข้อความภาษาไทย และไม่ส่ง stack trace ออกไป
const multer = require('multer');

module.exports = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'เกิดข้อผิดพลาดภายในระบบ';

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? `ไฟล์มีขนาดเกิน ${process.env.UPLOAD_MAX_MB || 10} MB`
      : 'ไม่สามารถอัปโหลดไฟล์ได้ (' + err.code + ')';
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'ข้อมูลซ้ำกับที่มีอยู่แล้ว';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    status = 409;
    message = 'ไม่สามารถลบได้ เนื่องจากมีข้อมูลอื่นเชื่อมโยงอยู่';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 422;
    message = 'ข้อมูลอ้างอิงไม่ถูกต้อง';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'รูปแบบข้อมูล JSON ไม่ถูกต้อง';
  }

  if (status >= 500) {
    console.error('[ERROR]', err);
    if (process.env.NODE_ENV === 'production') message = 'เกิดข้อผิดพลาดภายในระบบ';
  }
  res.status(status).json({ success: false, message });
};
