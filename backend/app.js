// app.js — ตั้งค่า Express (แยกจาก server.js เพื่อให้ทดสอบด้วย supertest ได้)
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');

dotenv.config();
if (!process.env.JWT_SECRET) {
  throw new Error('ต้องตั้งค่า JWT_SECRET ในไฟล์ .env ก่อนเริ่มระบบ');
}

const app = express();
app.disable('x-powered-by');

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// หมายเหตุ: ไม่เปิด /uploads เป็น static แล้ว — ดาวน์โหลดไฟล์ผ่าน /api/attachments/:id/file ที่ตรวจสิทธิ์เท่านั้น

// Health check (ใช้กับ docker healthcheck / CI)
app.get('/health', (req, res) => {
  res.json({ service: 'pes-api', status: 'ok', time: new Date().toISOString() });
});

// เอกสาร API (Swagger)
app.get('/openapi.json', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'openapi.json'));
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { url: '/openapi.json' } }));

app.use('/api', require('./routes'));

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'ไม่พบเส้นทางที่ร้องขอ' });
});
app.use(require('./middlewares/error'));

module.exports = app;
