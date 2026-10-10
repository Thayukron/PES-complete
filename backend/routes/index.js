// routes/index.js
// รวมเส้นทาง API ทั้งหมด (prefix /api) — ดูรายละเอียดเพิ่มที่ /docs
const router = require('express').Router();
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const authCtrl = require('../controllers/auth.controller');
const users = require('../controllers/users.controller');
const master = require('../controllers/master.controller');
const periods = require('../controllers/periods.controller');
const topics = require('../controllers/topics.controller');
const assignments = require('../controllers/assignments.controller');
const attachments = require('../controllers/attachments.controller');
const evaluation = require('../controllers/evaluation.controller');
const reports = require('../controllers/reports.controller');

const ADMIN = auth('admin');
const ANY = auth();

// ---------- Auth / โปรไฟล์ ----------
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', ANY, authCtrl.me);
router.put('/auth/me', ANY, authCtrl.updateMe);
router.put('/auth/password', ANY, authCtrl.changePassword);

// ---------- ผู้ใช้ (admin) ----------
router.get('/users', ADMIN, users.list);
router.get('/users/:id', ADMIN, users.get);
router.post('/users', ADMIN, users.create);
router.put('/users/:id', ADMIN, users.update);
router.delete('/users/:id', ADMIN, users.remove);

// ---------- ข้อมูลพื้นฐาน ----------
router.get('/lookups', ANY, master.lookups);
for (const [path, ctrl] of [['departments', master.departments], ['org-groups', master.orgGroups], ['evidence-types', master.evidenceTypes]]) {
  router.post(`/${path}`, ADMIN, ctrl.create);
  router.put(`/${path}/:id`, ADMIN, ctrl.update);
  router.delete(`/${path}/:id`, ADMIN, ctrl.remove);
}

// ---------- รอบการประเมิน ----------
router.get('/periods', ANY, periods.list);
router.get('/periods/active', ANY, periods.active);
router.post('/periods', ADMIN, periods.create);
router.put('/periods/:id', ADMIN, periods.update);
router.delete('/periods/:id', ADMIN, periods.remove);

// ---------- ด้าน / ตัวชี้วัด ----------
router.get('/topics', ANY, topics.list);
router.post('/topics', ADMIN, topics.createTopic);
router.put('/topics/:id', ADMIN, topics.updateTopic);
router.delete('/topics/:id', ADMIN, topics.removeTopic);
router.get('/indicators', ANY, topics.indicators);
router.get('/indicators/:id/evidence-types', ANY, topics.indicatorEvidenceTypes);
router.post('/indicators', ADMIN, topics.createIndicator);
router.put('/indicators/:id', ADMIN, topics.updateIndicator);
router.delete('/indicators/:id', ADMIN, topics.removeIndicator);

// ---------- จับคู่กรรมการ ----------
router.get('/assignments/mine', auth('evaluator'), assignments.mine);
router.get('/assignments', ADMIN, assignments.list);
router.post('/assignments', ADMIN, assignments.create);
router.delete('/assignments/:id', ADMIN, assignments.remove);

// ---------- หลักฐาน ----------
router.get('/attachments', ANY, attachments.list);
router.post('/attachments', auth('evaluatee'), upload.single('file'), attachments.create);
router.get('/attachments/:id/file', ANY, attachments.download);
router.delete('/attachments/:id', auth('evaluatee', 'admin'), attachments.remove);

// ---------- ประเมินตนเอง / ให้คะแนน ----------
router.get('/self-assessments', ANY, evaluation.getSelf);
router.put('/self-assessments', auth('evaluatee'), evaluation.saveSelf);
router.post('/self-assessments/reopen', ADMIN, evaluation.reopenSelf);
router.get('/results', auth('evaluator', 'admin'), evaluation.getResults);
router.put('/results', auth('evaluator'), evaluation.saveResults);
router.post('/results/reopen', ADMIN, evaluation.reopenResults);

// ---------- รายงาน / แดชบอร์ด ----------
router.get('/dashboard', ANY, reports.dashboard);
router.get('/reports/summary', auth('admin', 'evaluator'), reports.summary);
router.get('/reports/evaluatee/:id', ANY, reports.evaluatee);

module.exports = router;
