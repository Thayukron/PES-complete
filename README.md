# ระบบประเมินบุคลากร (PES — Personnel Evaluation System)

> **ชุดนี้: PES-complete — สำหรับซ้อมแข่ง (ตัวชี้วัดเทมเพลตการแข่งขัน 4 ด้าน 17 ตัวชี้วัด)**
> ชุดตัวชี้วัดตามแบบประเมิน PA และแบบประเมินเลื่อนเงินเดือน (ใช้งานจริง) อยู่ที่โฟลเดอร์ `../PES-pa-salary` — สองชุดแยก git, container และพอร์ตกัน รันพร้อมกันได้
>
> | ชุด | โฟลเดอร์ | Docker project | เว็บ | API | phpMyAdmin | MySQL |
> |---|---|---|---|---|---|---|
> | ซ้อมแข่ง (ชุดนี้) | `PES-complete` | `pes-skill` | 3000 | 7000 | 8082 | 3308 |
> | PA/เงินเดือน | `PES-pa-salary` | `pes-pa` | 3100 | 7100 | 8084 | 3309 |

ระบบประเมินครูผ่านเว็บ: ครูอัปโหลดหลักฐานและประเมินตนเอง → กรรมการตรวจหลักฐานและให้คะแนน → ระบบคำนวณคะแนนถ่วงน้ำหนักและออกรายงาน
ใช้เครื่องมือตามรายการ Templates ของการแข่งขันทักษะ (Node.js/Express + Nuxt 3/Vuetify + MySQL)

| ส่วน | เทคโนโลยี | พอร์ต |
|---|---|---|
| Frontend | Nuxt 3 (SPA) + Vuetify 3 + Pinia + axios | http://localhost:3000 |
| Backend API | Node.js 20 + Express + Knex + JWT + multer | http://localhost:7000 (Swagger: `/docs`) |
| Database | MySQL 8 (+ phpMyAdmin) | localhost:3308 / http://localhost:8082 |

---

## เริ่มใช้งาน (Docker)

```bash
docker compose up -d --build
```

เปิด http://localhost:3000 แล้วเข้าสู่ระบบด้วยบัญชีตัวอย่าง (**รหัสผ่านทุกบัญชี: `Pes@2568`**)

| บทบาท | อีเมล |
|---|---|
| ผู้ดูแลระบบ (admin) | `admin@ccollege.ac.th` |
| กรรมการ (evaluator) | `eva.it@ccollege.ac.th`, `eva.me@ccollege.ac.th` |
| ครู (evaluatee) | `t.it01@ccollege.ac.th`, `t.me01@ccollege.ac.th`, `t.acc01@ccollege.ac.th` |

> ⚠️ ใช้งานจริง: คัดลอก `.env.example` เป็น `.env` แล้วเปลี่ยน `JWT_SECRET` และ `DB_ROOT_PASSWORD` จากนั้นเปลี่ยนรหัสผ่านบัญชีตัวอย่างทั้งหมด

คำสั่งที่ใช้บ่อย

```bash
docker compose ps                 # ดูสถานะ
docker compose logs -f api        # ดู log ของ API
docker compose down               # หยุดระบบ (ข้อมูลยังอยู่)
docker compose down -v            # หยุดและล้างฐานข้อมูล + ไฟล์อัปโหลด (โหลด schema.sql ใหม่ตอน up)
```

## ขั้นตอนการทำงานของระบบ

1. **ผู้ดูแลระบบ** สร้างรอบการประเมิน → ตั้งด้าน/ตัวชี้วัด/ชนิดหลักฐาน → เพิ่มผู้ใช้ → จับคู่กรรมการกับครู
2. **ครู** ดูตัวชี้วัด → อัปโหลดหลักฐาน → ประเมินตนเอง (บันทึกร่างได้) → กดส่ง
3. **กรรมการ** เปิดรายชื่อครูที่รับผิดชอบ → เปิดดูหลักฐาน → ให้คะแนน + ความเห็นรายตัวชี้วัด + ข้อเสนอแนะภาพรวม → กดส่ง
4. **ครู** ดูผลและข้อเสนอแนะ (เห็นเมื่อกรรมการส่งผลแล้วเท่านั้น) → พิมพ์รายงาน/บันทึก PDF/ส่งออก CSV
5. **ผู้ดูแลระบบ** ติดตามความคืบหน้า เปิดให้แก้ไขผลที่ส่งแล้ว และออกรายงานสรุปทั้งรอบ

### เมนูตามบทบาท

| ผู้ดูแลระบบ | กรรมการ | ครู |
|---|---|---|
| แดชบอร์ด | แดชบอร์ด | แดชบอร์ด (ขั้นตอนการประเมิน) |
| ติดตามความคืบหน้า (เปิดให้แก้ไขผล) | รายชื่อผู้รับการประเมิน → ให้คะแนน | ตัวชี้วัด |
| รายงานผลการประเมิน (CSV/พิมพ์) | สรุปผลการประเมิน | อัปโหลดหลักฐาน |
| จับคู่กรรมการ | รายงานรายบุคคล | ประเมินตนเอง |
| ผู้ใช้งาน (เพิ่ม/แก้ไข/ปิดใช้งาน/รีเซ็ตรหัส) | | ความคืบหน้า |
| รอบการประเมิน (เปิด/ปิดรอบ) | | ผลการประเมินและข้อเสนอแนะ |
| ด้านและตัวชี้วัด | | พิมพ์/ส่งออกรายงาน |
| ข้อมูลพื้นฐาน (แผนก/ฝ่าย/ชนิดหลักฐาน) | | |

ทุกบทบาท: ข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน, โหมดมืด, รองรับมือถือ

### การคำนวณคะแนน (`backend/utils/scoring.js`)

- ตัวชี้วัดแบบ **ให้คะแนน**: `คะแนน / คะแนนสูงสุด × 100` (เช่น 3 จาก 4 = 75%)
- ตัวชี้วัดแบบ **มี/ไม่มี**: มี = 100%, ไม่มี = 0%
- คะแนนด้าน = ค่าเฉลี่ยถ่วงน้ำหนักของตัวชี้วัดในด้าน (น้ำหนักตัวชี้วัด)
- คะแนนรวม = ค่าเฉลี่ยถ่วงน้ำหนักของด้าน (น้ำหนักด้าน เช่น 0.30 / 0.20 / 0.30 / 0.20)
- มีกรรมการหลายท่าน: ใช้ค่าเฉลี่ย (มี/ไม่มี ใช้เสียงข้างมาก) — นับเฉพาะผลที่ "ส่งแล้ว"
- ระดับ: ≥90 ดีเยี่ยม · ≥80 ดีมาก · ≥70 ดี · ≥60 พอใช้ · <60 ต้องปรับปรุง

### ความปลอดภัยที่มีในระบบ

- JWT + ตรวจบทบาททุก endpoint, บัญชีที่ปิดใช้งานเข้าสู่ระบบไม่ได้
- กรรมการเห็นเฉพาะครูที่ได้รับมอบหมาย, ครูเห็นเฉพาะข้อมูลตัวเอง
- ไฟล์หลักฐาน **ไม่เปิดเป็น static** — ดาวน์โหลดผ่าน `/api/attachments/:id/file` ที่ตรวจสิทธิ์เท่านั้น
- ตรวจชนิดไฟล์/ขนาดไฟล์ฝั่ง server, ตรวจชนิดหลักฐานให้ตรงกับตัวชี้วัด, รองรับชื่อไฟล์ภาษาไทย
- ส่งแล้วล็อก แก้ไขได้เมื่อ admin เปิดให้แก้, ปิดรอบแล้วทุกอย่างเป็นอ่านอย่างเดียว
- ลบผู้ใช้/รอบ/ตัวชี้วัดที่มีข้อมูลการประเมินแล้วไม่ได้ (ให้ปิดใช้งานแทน)

---

## พัฒนาแบบไม่ใช้ Docker (รันทีละส่วน)

```bash
# 1) ฐานข้อมูล (ใช้ docker เฉพาะ MySQL) — เปิดที่ localhost:3308
docker compose up -d db phpmyadmin

# 2) Backend
cd backend
cp .env.example .env        # แก้ JWT_SECRET
npm install
npm run dev                 # http://localhost:7000  (docs: /docs)

# 3) Frontend (เทอร์มินัลใหม่)
cd frontend
npm install
npm run dev                 # http://localhost:3000  (ส่งต่อ /api ไป http://localhost:7000)
```

ถ้า API อยู่ที่อื่น ตั้ง `NUXT_API_INTERNAL=http://<host>:7000` ก่อนรัน frontend

## การทดสอบ

```bash
# Backend: unit test (สูตรคะแนน) + integration test กับฐานข้อมูลจริง
docker compose up -d db
cd backend && npm test      # ถ้าต่อฐานข้อมูลไม่ได้ integration test จะถูกข้าม

# Frontend: unit test
cd frontend && npm test
```

Integration test (`backend/test/api.spec.js`) สร้างผู้ใช้/รอบทดสอบของตัวเอง ทดสอบ login, สิทธิ์ทุกบทบาท, อัปโหลด/ดาวน์โหลด, ประเมินตนเอง, ให้คะแนน, รายงาน แล้วลบข้อมูลทิ้งเมื่อจบ

## CI/CD (GitLab)

`.gitlab-ci.yml`: test (backend + MySQL service, frontend + build) → build & push image → deploy (manual, SSH + `docker-compose.prod.yml`)
ดูสิ่งที่ต้องเตรียมท้ายไฟล์ `.gitlab-ci.yml` และ `deploy/backend.env.example`

## โครงสร้างโปรเจกต์

```
schema.sql                 สคีมา + ข้อมูลตัวอย่าง (โหลดอัตโนมัติตอนสร้างฐานข้อมูลครั้งแรก)
docker-compose.yml         สำหรับพัฒนา/ซ้อม
docker-compose.prod.yml    สำหรับ production (ใช้ image จาก registry)
backend/
  app.js, server.js        ตั้งค่า Express / จุดเริ่มต้น
  routes/index.js          เส้นทาง API ทั้งหมด + สิทธิ์ของแต่ละเส้นทาง
  controllers/             auth, users, master, periods, topics, assignments, attachments, evaluation, reports
  middlewares/             auth (JWT+role), upload (multer), error (ข้อความภาษาไทย)
  utils/                   authz (ตรวจสิทธิ์), scoring (สูตรคะแนน), progress (สรุปความคืบหน้า)
  openapi.json             เอกสาร API (Swagger ที่ /docs)
  test/                    vitest + supertest
frontend/
  pages/                   login, index (แดชบอร์ด), profile, admin/*, eval/*, me/*, report/[id]
  components/              PageHeader, PeriodSelect, FileList, ScoreInput, SummaryReport, ...
  composables/             useMenu, usePeriods, useNotify, useConfirm, useAttachment, useEvaluateeReport
  middleware/auth.global.js  ตรวจการล็อกอินและบทบาทก่อนเข้าหน้า
  plugins/                 vuetify (ธีม/ภาษาไทย), api (axios + token)
  server/api/[...path].ts  ส่งต่อ /api/** ไป Backend (ไม่ติด CORS, ใช้ได้ทุกโดเมน/IP)
```

## ตาราง API หลัก

ดูทั้งหมดและทดลองยิงได้ที่ http://localhost:7000/docs (กด Authorize แล้วใส่ token จาก `/api/auth/login`)

| Method | Path | สิทธิ์ |
|---|---|---|
| POST | `/api/auth/login` | ทุกคน |
| GET/PUT | `/api/auth/me`, PUT `/api/auth/password` | ทุกบทบาท |
| CRUD | `/api/users` | admin |
| GET | `/api/lookups`, `/api/periods`, `/api/topics` | ทุกบทบาท |
| CRUD | `/api/periods`, `/api/topics`, `/api/indicators`, `/api/departments`, `/api/org-groups`, `/api/evidence-types` | admin |
| GET/POST/DELETE | `/api/assignments` | admin |
| GET | `/api/assignments/mine` | evaluator |
| GET/POST/DELETE | `/api/attachments`, GET `/api/attachments/:id/file` | ตามสิทธิ์ |
| GET/PUT | `/api/self-assessments` | evaluatee (กรรมการ/admin ดูได้) |
| GET/PUT | `/api/results` | evaluator (admin ดูได้) |
| POST | `/api/self-assessments/reopen`, `/api/results/reopen` | admin |
| GET | `/api/dashboard`, `/api/reports/summary`, `/api/reports/evaluatee/:id` | ตามสิทธิ์ |
