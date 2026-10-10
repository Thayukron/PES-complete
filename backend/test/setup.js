// ค่าเริ่มต้นสำหรับรันเทสต์ (ไม่ทับค่าจาก .env ถ้ามี)
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
