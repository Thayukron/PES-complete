// middlewares/auth.js
// ตรวจ JWT จาก header "Authorization: Bearer <token>" และจำกัดบทบาท
// ใช้: auth()                     -> ต้องล็อกอิน (ทุกบทบาท)
//      auth('admin')              -> เฉพาะ admin
//      auth('admin','evaluator')  -> admin หรือ evaluator
const jwt = require('jsonwebtoken');

module.exports = (...roles) => (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    const message = e.name === 'TokenExpiredError'
      ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
      : 'โทเค็นไม่ถูกต้อง';
    return res.status(401).json({ success: false, message });
  }

  if (roles.length && !roles.includes(payload.role)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' });
  }

  req.user = { id: Number(payload.id), role: payload.role, name: payload.name };
  next();
};
