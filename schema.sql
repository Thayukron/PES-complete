-- Single-file init: schema + seed
-- MySQL 8.x
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE DATABASE IF NOT EXISTS skills_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE skills_db;

-- Drop old objects (order matters)
DROP VIEW IF EXISTS v_evidence_progress;

DROP TABLE IF EXISTS evaluation_feedback;
DROP TABLE IF EXISTS self_assessments;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS evaluation_results;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS indicator_evidence;
DROP TABLE IF EXISTS evidence_types;
DROP TABLE IF EXISTS indicators;
DROP TABLE IF EXISTS evaluation_topics;
DROP TABLE IF EXISTS evaluation_periods;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS dept_fields;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS org_groups;
DROP TABLE IF EXISTS vocational_fields;
DROP TABLE IF EXISTS vocational_categories;

SET FOREIGN_KEY_CHECKS=1;

-- =========================
-- SCHEMA
-- =========================

CREATE TABLE vocational_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name_th VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE vocational_fields (
  code VARCHAR(10) PRIMARY KEY,
  name_th VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  CONSTRAINT fk_vf_cat
    FOREIGN KEY (category_id) REFERENCES vocational_categories(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE org_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name_th VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name_th VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  org_group_id INT NOT NULL,
  CONSTRAINT fk_dept_cat
    FOREIGN KEY (category_id) REFERENCES vocational_categories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dept_org
    FOREIGN KEY (org_group_id) REFERENCES org_groups(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE dept_fields (
  dept_id INT NOT NULL,
  field_code VARCHAR(10) NOT NULL,
  PRIMARY KEY (dept_id, field_code),
  CONSTRAINT fk_df_dept
    FOREIGN KEY (dept_id) REFERENCES departments(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_df_field
    FOREIGN KEY (field_code) REFERENCES vocational_fields(code)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,        -- ใช้ชื่อคอลัมน์ให้ตรงกับ seed
  name_th VARCHAR(255) NOT NULL,
  role ENUM('admin','evaluator','evaluatee') NOT NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  department_id INT NULL,
  org_group_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_dept
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_users_org
    FOREIGN KEY (org_group_id) REFERENCES org_groups(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluation_periods (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name_th VARCHAR(255) NOT NULL,
  buddhist_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE evaluation_topics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  title_th VARCHAR(255) NOT NULL,
  description TEXT NULL,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0.00,      -- น้ำหนักแบบประเมินผลการปฏิบัติงาน (เลื่อนเงินเดือน)
  pa_weight DECIMAL(5,2) NOT NULL DEFAULT 0.00,   -- น้ำหนักแบบประเมิน PA (0 = ไม่นับใน PA)
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE indicators (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  name_th VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type ENUM('score_1_4','yes_no','file_url') NOT NULL DEFAULT 'score_1_4',
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  min_score TINYINT NOT NULL DEFAULT 1,
  max_score TINYINT NOT NULL DEFAULT 4,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ind_topic
    FOREIGN KEY (topic_id) REFERENCES evaluation_topics(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_ind_topic (topic_id)
) ENGINE=InnoDB;

CREATE TABLE evidence_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name_th VARCHAR(255) NOT NULL,
  description TEXT NULL
) ENGINE=InnoDB;

CREATE TABLE indicator_evidence (
  indicator_id BIGINT UNSIGNED NOT NULL,
  evidence_type_id INT NOT NULL,
  PRIMARY KEY (indicator_id, evidence_type_id),
  CONSTRAINT fk_ie_ind
    FOREIGN KEY (indicator_id) REFERENCES indicators(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ie_ev
    FOREIGN KEY (evidence_type_id) REFERENCES evidence_types(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  period_id BIGINT UNSIGNED NOT NULL,
  evaluator_id BIGINT UNSIGNED NOT NULL,
  evaluatee_id BIGINT UNSIGNED NOT NULL,
  dept_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asg_period
    FOREIGN KEY (period_id) REFERENCES evaluation_periods(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_asg_evalr
    FOREIGN KEY (evaluator_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_asg_evale
    FOREIGN KEY (evaluatee_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_asg_dept
    FOREIGN KEY (dept_id) REFERENCES departments(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT uniq_asg UNIQUE (period_id, evaluator_id, evaluatee_id),
  KEY idx_asg_evalr (evaluator_id, period_id),
  KEY idx_asg_evale (evaluatee_id, period_id)
) ENGINE=InnoDB;

CREATE TABLE evaluation_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  period_id BIGINT UNSIGNED NOT NULL,
  evaluatee_id BIGINT UNSIGNED NOT NULL,
  evaluator_id BIGINT UNSIGNED NOT NULL,
  topic_id BIGINT UNSIGNED NOT NULL,
  indicator_id BIGINT UNSIGNED NOT NULL,
  score DECIMAL(5,2) NULL,
  value_yes_no TINYINT(1) NULL,
  notes TEXT NULL,
  status ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_res_period  FOREIGN KEY (period_id)    REFERENCES evaluation_periods(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_res_evale   FOREIGN KEY (evaluatee_id) REFERENCES users(id)              ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_res_evalr   FOREIGN KEY (evaluator_id) REFERENCES users(id)              ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_res_topic   FOREIGN KEY (topic_id)     REFERENCES evaluation_topics(id)  ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_res_ind     FOREIGN KEY (indicator_id) REFERENCES indicators(id)         ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY uniq_result (period_id, evaluatee_id, evaluator_id, indicator_id),
  KEY idx_results_evale (evaluatee_id, period_id),
  KEY idx_results_indicator (indicator_id)
) ENGINE=InnoDB;

CREATE TABLE attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  period_id BIGINT UNSIGNED NOT NULL,
  evaluatee_id BIGINT UNSIGNED NOT NULL,
  indicator_id BIGINT UNSIGNED NOT NULL,
  evidence_type_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  storage_path VARCHAR(1024) NOT NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_att_period  FOREIGN KEY (period_id)       REFERENCES evaluation_periods(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_att_evale   FOREIGN KEY (evaluatee_id)    REFERENCES users(id)              ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_att_ind     FOREIGN KEY (indicator_id)    REFERENCES indicators(id)         ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_att_evtype  FOREIGN KEY (evidence_type_id) REFERENCES evidence_types(id)    ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_attach_evale (evaluatee_id, period_id)
) ENGINE=InnoDB;

-- ผลการประเมินตนเองของครู (1 แถวต่อ 1 ตัวชี้วัด)
CREATE TABLE self_assessments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  period_id BIGINT UNSIGNED NOT NULL,
  evaluatee_id BIGINT UNSIGNED NOT NULL,
  indicator_id BIGINT UNSIGNED NOT NULL,
  score DECIMAL(5,2) NULL,
  value_yes_no TINYINT(1) NULL,
  notes TEXT NULL,
  status ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sa_period FOREIGN KEY (period_id)    REFERENCES evaluation_periods(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sa_evale  FOREIGN KEY (evaluatee_id) REFERENCES users(id)              ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sa_ind    FOREIGN KEY (indicator_id) REFERENCES indicators(id)         ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uniq_sa (period_id, evaluatee_id, indicator_id)
) ENGINE=InnoDB;

-- ข้อเสนอแนะภาพรวมจากกรรมการถึงครู (1 แถวต่อกรรมการ 1 คน ต่อครู 1 คน ต่อรอบ)
CREATE TABLE evaluation_feedback (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  period_id BIGINT UNSIGNED NOT NULL,
  evaluatee_id BIGINT UNSIGNED NOT NULL,
  evaluator_id BIGINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fb_period FOREIGN KEY (period_id)    REFERENCES evaluation_periods(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_fb_evale  FOREIGN KEY (evaluatee_id) REFERENCES users(id)              ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_fb_evalr  FOREIGN KEY (evaluator_id) REFERENCES users(id)              ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uniq_fb (period_id, evaluatee_id, evaluator_id)
) ENGINE=InnoDB;

-- Helpful indexes
CREATE INDEX idx_users_dept ON users(department_id);

-- =========================
-- SEED DATA
-- =========================

-- Categories
INSERT INTO vocational_categories (code, name_th) VALUES
('CAT01','อุตสาหกรรม'),
('CAT02','บริหารธุรกิจ'),
('CAT03','ศิลปกรรมและเศรษฐกิจสร้างสรรค์'),
('CAT04','คหกรรม'),
('CAT05','เกษตรกรรมและประมง'),
('CAT06','อุตสาหกรรมท่องเที่ยว'),
('CAT07','อุตสาหกรรมแฟชั่นและสิ่งทอ'),
('CAT08','อุตสาหกรรมดิจิทัลและเทคโนโลยีสารสนเทศ'),
('CAT09','โลจิสติกส์'),
('CAT10','อุตสาหกรรมสุขภาพและความงาม'),
('CAT11','อุตสาหกรรมบันเทิง');

-- Fields (subset incl. IT/ME/EL/ACC/MKT)
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20101','ช่างยนต์', id FROM vocational_categories WHERE code='CAT01';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20102','ช่างกลโรงงาน', id FROM vocational_categories WHERE code='CAT01';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20103','ช่างเชื่อมโลหะ', id FROM vocational_categories WHERE code='CAT01';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20104','ช่างไฟฟ้ากำลัง', id FROM vocational_categories WHERE code='CAT01';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20105','อิเล็กทรอนิกส์', id FROM vocational_categories WHERE code='CAT01';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20127','เมคคาทรอนิกส์และหุ่นยนต์', id FROM vocational_categories WHERE code='CAT01';

INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20201','การบัญชี', id FROM vocational_categories WHERE code='CAT02';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20202','การตลาด', id FROM vocational_categories WHERE code='CAT02';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20216','การจัดการสำนักงานดิจิทัล', id FROM vocational_categories WHERE code='CAT02';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21910','เทคโนโลยีธุรกิจดิจิทัล', id FROM vocational_categories WHERE code='CAT02';

INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21602','การออกแบบ', id FROM vocational_categories WHERE code='CAT03';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21606','การถ่ายภาพและมัลติมีเดีย', id FROM vocational_categories WHERE code='CAT03';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21619','ออกแบบนิเทศศิลป์', id FROM vocational_categories WHERE code='CAT03';

INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21804','แฟชั่นและสิ่งทอ', id FROM vocational_categories WHERE code='CAT04';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21504','อาหารและโภชนาการ', id FROM vocational_categories WHERE code='CAT04';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20406','คหกรรมศาสตร์', id FROM vocational_categories WHERE code='CAT04';

INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21701','เกษตรศาสตร์', id FROM vocational_categories WHERE code='CAT05';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21709','นวัตกรรมเกษตร', id FROM vocational_categories WHERE code='CAT05';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21715','ประมง', id FROM vocational_categories WHERE code='CAT05';

INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20701','การโรงแรม', id FROM vocational_categories WHERE code='CAT06';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '20702','การท่องเที่ยว', id FROM vocational_categories WHERE code='CAT06';

INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21801','เทคโนโลยีสิ่งทอ', id FROM vocational_categories WHERE code='CAT07';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21802','เคมีสิ่งทอ', id FROM vocational_categories WHERE code='CAT07';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21803','เทคโนโลยีเครื่องนุ่งห่ม', id FROM vocational_categories WHERE code='CAT07';

INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21901','เทคโนโลยีสารสนเทศ', id FROM vocational_categories WHERE code='CAT08';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21903','คอมพิวเตอร์โปรแกรมเมอร์', id FROM vocational_categories WHERE code='CAT08';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21906','เทคโนโลยีปัญญาประดิษฐ์', id FROM vocational_categories WHERE code='CAT08';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21907','เทคโนโลยีโลกเสมือนจริง', id FROM vocational_categories WHERE code='CAT08';

INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21401','โลจิสติกส์', id FROM vocational_categories WHERE code='CAT09';

INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21302','การจัดการงานบริการสถานพยาบาล', id FROM vocational_categories WHERE code='CAT10';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21303','ธุรกิจการกีฬา', id FROM vocational_categories WHERE code='CAT10';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '21305','ธุรกิจเสริมสวย', id FROM vocational_categories WHERE code='CAT10';

INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '22001','อุตสาหกรรมแสงและเสียง', id FROM vocational_categories WHERE code='CAT11';
INSERT INTO vocational_fields (code, name_th, category_id)
SELECT '22002','อุตสาหกรรมดนตรี', id FROM vocational_categories WHERE code='CAT11';

-- Org groups (ลบจุลภาคท้ายบรรทัดสุดท้าย)
INSERT INTO org_groups (code, name_th) VALUES
('ACD','ฝ่ายวิชาการ'),
('STD','ฝ่ายพัฒนากิจการนักเรียนนักศึกษา'),
('FIN','ฝ่ายบริหารทรัพยากร'),
('PLA','ฝ่ายแผนงานและความร่วมมือ');

-- Departments
INSERT INTO departments (code, name_th, category_id, org_group_id)
SELECT 'IT','แผนกวิชาเทคโนโลยีสารสนเทศ', id, (SELECT id FROM org_groups WHERE code='ACD')
FROM vocational_categories WHERE code='CAT08';
INSERT INTO departments (code, name_th, category_id, org_group_id)
SELECT 'ME','แผนกวิชาเครื่องกล', id, (SELECT id FROM org_groups WHERE code='ACD')
FROM vocational_categories WHERE code='CAT01';
INSERT INTO departments (code, name_th, category_id, org_group_id)
SELECT 'EL','แผนกวิชาอิเล็กทรอนิกส์', id, (SELECT id FROM org_groups WHERE code='ACD')
FROM vocational_categories WHERE code='CAT01';
INSERT INTO departments (code, name_th, category_id, org_group_id)
SELECT 'ACC','แผนกวิชาการบัญชี', id, (SELECT id FROM org_groups WHERE code='ACD')
FROM vocational_categories WHERE code='CAT02';
INSERT INTO departments (code, name_th, category_id, org_group_id)
SELECT 'MKT','แผนกวิชาการตลาด', id, (SELECT id FROM org_groups WHERE code='ACD')
FROM vocational_categories WHERE code='CAT02';

-- Department ↔ Field
INSERT INTO dept_fields (dept_id, field_code)
SELECT d.id, '21901' FROM departments d WHERE d.code='IT';
INSERT INTO dept_fields (dept_id, field_code)
SELECT d.id, '21903' FROM departments d WHERE d.code='IT';
INSERT INTO dept_fields (dept_id, field_code)
SELECT d.id, '20101' FROM departments d WHERE d.code='ME';
INSERT INTO dept_fields (dept_id, field_code)
SELECT d.id, '20105' FROM departments d WHERE d.code='EL';
INSERT INTO dept_fields (dept_id, field_code)
SELECT d.id, '20201' FROM departments d WHERE d.code='ACC';
INSERT INTO dept_fields (dept_id, field_code)
SELECT d.id, '20202' FROM departments d WHERE d.code='MKT';

-- Users — ทุกบัญชีตัวอย่างใช้รหัสผ่าน: Pes@2568 (ควรเปลี่ยนหลังติดตั้งจริง)
INSERT INTO users (email, password_hash, name_th, role, department_id, org_group_id) VALUES
('admin@ccollege.ac.th', '$2a$10$RITdychQz3LxlKF.o5FoCeruIWc0Y6Pr/IVx2d1XdBgw7WF66T6Ve', 'ผู้ดูแลระบบ', 'admin',
 (SELECT id FROM departments WHERE code='IT'), (SELECT id FROM org_groups WHERE code='ACD')),
('eva.me@ccollege.ac.th', '$2a$10$RITdychQz3LxlKF.o5FoCeruIWc0Y6Pr/IVx2d1XdBgw7WF66T6Ve', 'กรรมการประเมินเครื่องกล', 'evaluator',
 (SELECT id FROM departments WHERE code='ME'), (SELECT id FROM org_groups WHERE code='ACD')),
('eva.it@ccollege.ac.th', '$2a$10$RITdychQz3LxlKF.o5FoCeruIWc0Y6Pr/IVx2d1XdBgw7WF66T6Ve', 'กรรมการประเมินไอที', 'evaluator',
 (SELECT id FROM departments WHERE code='IT'), (SELECT id FROM org_groups WHERE code='ACD')),
('t.it01@ccollege.ac.th', '$2a$10$RITdychQz3LxlKF.o5FoCeruIWc0Y6Pr/IVx2d1XdBgw7WF66T6Ve', 'ครูไอที 01', 'evaluatee',
 (SELECT id FROM departments WHERE code='IT'), (SELECT id FROM org_groups WHERE code='ACD')),
('t.me01@ccollege.ac.th', '$2a$10$RITdychQz3LxlKF.o5FoCeruIWc0Y6Pr/IVx2d1XdBgw7WF66T6Ve', 'ครูเครื่องกล 01', 'evaluatee',
 (SELECT id FROM departments WHERE code='ME'), (SELECT id FROM org_groups WHERE code='ACD')),
('t.acc01@ccollege.ac.th', '$2a$10$RITdychQz3LxlKF.o5FoCeruIWc0Y6Pr/IVx2d1XdBgw7WF66T6Ve', 'ครูบัญชี 01', 'evaluatee',
 (SELECT id FROM departments WHERE code='ACC'), (SELECT id FROM org_groups WHERE code='ACD'));

-- Periods — รอบการประเมินผลการปฏิบัติงาน (เลื่อนเงินเดือน) ปีละ 2 รอบ
INSERT INTO evaluation_periods (code, name_th, buddhist_year, start_date, end_date, is_active) VALUES
('R1-2569','การประเมินผลการปฏิบัติงาน ครั้งที่ 1 (1 ต.ค. 2568 – 31 มี.ค. 2569)', 2569, '2025-10-01','2026-03-31', 0),
('R2-2569','การประเมินผลการปฏิบัติงาน ครั้งที่ 2 (1 เม.ย. – 30 ก.ย. 2569)', 2569, '2026-04-01','2026-09-30', 1);

-- =====================================================================
-- ด้าน/ตัวชี้วัด ตาม "แบบประเมินผลการปฏิบัติงาน ตำแหน่งครู วิทยฐานะครูชำนาญการพิเศษ (ทุกสังกัด)"
-- และ "แบบประเมินผลการพัฒนางานตามข้อตกลง (PA2/ส)" ซึ่งใช้ตัวชี้วัดชุดเดียวกัน
--
--   weight    = น้ำหนักแบบประเมินผลการปฏิบัติงาน (เลื่อนเงินเดือน) รวม 1.00 = 100 คะแนน
--   pa_weight = น้ำหนักแบบประเมิน PA (PA2/ส)                    รวม 1.00 = 100 คะแนน
--
--   ด้าน                          ตัวชี้วัด  เงินเดือน      PA
--   TOP1 ด้านการจัดการเรียนรู้          8      32  ┐         32  ┐
--   TOP2 ด้านการส่งเสริมฯ              4      16  ├ 60      16  ├ 60  (ส่วนที่ 1 / องค์ฯ 1 ตอน 1: 15 ตัวชี้วัด x 4)
--   TOP3 ด้านการพัฒนาตนเองฯ           3      12  ┘         12  ┘
--   TOP4 ประเด็นท้าทาย                3      20            40      (ส่วนที่ 2 / องค์ฯ 1 ตอน 2)
--   TOP5 การมีส่วนร่วมฯ (องค์ฯ 2)       1      10             -
--   TOP6 วินัย คุณธรรมฯ (องค์ฯ 3)      10      10             -
-- =====================================================================
INSERT INTO evaluation_topics (code, title_th, description, weight, pa_weight) VALUES
('TOP1','ด้านการจัดการเรียนรู้','องค์ประกอบที่ 1 ตอนที่ 1 / PA ส่วนที่ 1 — 8 ตัวชี้วัด ระดับ 1-4 (32 คะแนน)', 0.32, 0.32),
('TOP2','ด้านการส่งเสริมและสนับสนุนการจัดการเรียนรู้','องค์ประกอบที่ 1 ตอนที่ 1 / PA ส่วนที่ 1 — 4 ตัวชี้วัด ระดับ 1-4 (16 คะแนน)', 0.16, 0.16),
('TOP3','ด้านการพัฒนาตนเองและวิชาชีพ','องค์ประกอบที่ 1 ตอนที่ 1 / PA ส่วนที่ 1 — 3 ตัวชี้วัด ระดับ 1-4 (12 คะแนน)', 0.12, 0.12),
('TOP4','ประเด็นท้าทายในการพัฒนาผลลัพธ์การเรียนรู้ของผู้เรียน','องค์ประกอบที่ 1 ตอนที่ 2 (20 คะแนน) / PA ส่วนที่ 2 (40 คะแนน) — วิธีดำเนินการ 20 + เชิงปริมาณ 10 + เชิงคุณภาพ 10', 0.20, 0.40),
('TOP5','การมีส่วนร่วมในการพัฒนาการศึกษา','องค์ประกอบที่ 2 (10 คะแนน) — ระดับ 1-5 x น้ำหนัก 2 ตามร้อยละของงานที่ได้รับมอบหมายแล้วเสร็จ', 0.10, 0.00),
('TOP6','การปฏิบัติตนในการรักษาวินัย คุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ','องค์ประกอบที่ 3 (10 คะแนน) — 10 รายการ ระดับ 1-4 (คะแนนรวม ÷ 4)', 0.10, 0.00);

-- ระดับ 1-4: 1 = ต่ำกว่าระดับที่คาดหวังมาก, 2 = ต่ำกว่าระดับที่คาดหวัง, 3 = ตามระดับที่คาดหวัง, 4 = สูงกว่าระดับที่คาดหวัง
INSERT INTO indicators (topic_id, code, name_th, description, type, weight, min_score, max_score)
SELECT t.id, x.code, x.name_th, x.description, 'score_1_4', x.weight, 1, x.max_score
FROM evaluation_topics t
JOIN (
  SELECT 'TOP1' topic, '1.1' code, 'สร้างและหรือพัฒนาหลักสูตร' name_th, 'ริเริ่ม พัฒนารายวิชาและหน่วยการเรียนรู้ให้สอดคล้องกับมาตรฐานการเรียนรู้ และตัวชี้วัด หรือผลการเรียนรู้ ตามหลักสูตร บริบทของสถานศึกษา ผู้เรียน และท้องถิ่น สามารถแก้ไขปัญหาในการจัดการเรียนรู้ เพื่อให้ผู้เรียนได้พัฒนาสมรรถนะและการเรียนรู้เต็มตามศักยภาพ ส่งผลให้คุณภาพการจัดการเรียนรู้สูงขึ้น และเป็นแบบอย่างที่ดีในการสร้างและหรือพัฒนาหลักสูตร' description, 1.00 weight, 4 max_score, 1 ord
  UNION ALL SELECT 'TOP1','1.2','ออกแบบการจัดการเรียนรู้','ริเริ่ม คิดค้น การออกแบบการจัดการเรียนรู้ โดยเน้นผู้เรียนเป็นสำคัญ สามารถแก้ไขปัญหาและพัฒนาคุณภาพการจัดการเรียนรู้ให้สูงขึ้น เพื่อให้ผู้เรียนมีความรู้ ทักษะ คุณลักษณะประจำวิชา คุณลักษณะอันพึงประสงค์ และสมรรถนะที่สำคัญตามหลักสูตร มีกระบวนการคิดและค้นพบองค์ความรู้ด้วยตนเอง และสร้างแรงบันดาลใจ และเป็นแบบอย่างที่ดีในการออกแบบการจัดการเรียนรู้',1.00,4,2
  UNION ALL SELECT 'TOP1','1.3','จัดกิจกรรมการเรียนรู้','มีการริเริ่ม คิดค้น และพัฒนานวัตกรรมการจัดกิจกรรมการเรียนรู้ ที่สามารถแก้ไขปัญหาในการจัดการเรียนรู้ ทำให้ผู้เรียนได้พัฒนาเต็มตามศักยภาพ เรียนรู้และทำงานร่วมกัน มีกระบวนการคิดและค้นพบองค์ความรู้ด้วยตนเอง และสร้างแรงบันดาลใจและเป็นแบบอย่างที่ดีในการจัดกิจกรรมการเรียนรู้',1.00,4,3
  UNION ALL SELECT 'TOP1','1.4','สร้างและหรือพัฒนาสื่อ นวัตกรรม เทคโนโลยี และแหล่งเรียนรู้','มีการริเริ่ม คิดค้น และพัฒนาสื่อ นวัตกรรม เทคโนโลยี และแหล่งเรียนรู้สอดคล้องกับกิจกรรมการเรียนรู้ สามารถแก้ไขปัญหาในการเรียนรู้ของผู้เรียน และทำให้ผู้เรียนมีทักษะการคิด และสามารถสร้างนวัตกรรมได้ และเป็นแบบอย่างที่ดีในการสร้างและหรือพัฒนาสื่อ นวัตกรรม เทคโนโลยี และแหล่งเรียนรู้',1.00,4,4
  UNION ALL SELECT 'TOP1','1.5','วัดและประเมินผลการเรียนรู้','มีการริเริ่ม คิดค้น และพัฒนารูปแบบการวัดและประเมินผลการเรียนรู้ตามสภาพจริง ด้วยวิธีการที่หลากหลาย เหมาะสม และสอดคล้องกับมาตรฐานการเรียนรู้ และนำผลการวัดและประเมินผลการเรียนรู้มาใช้แก้ไขปัญหาการจัดการเรียนรู้ เพื่อให้ผู้เรียนพัฒนาการเรียนรู้อย่างต่อเนื่อง และเป็นแบบอย่างที่ดีในการวัดและประเมินผลการเรียนรู้',1.00,4,5
  UNION ALL SELECT 'TOP1','1.6','ศึกษา วิเคราะห์ และสังเคราะห์ เพื่อแก้ไขปัญหาหรือพัฒนาการเรียนรู้','มีการริเริ่ม คิดค้น วิเคราะห์ และสังเคราะห์ เพื่อแก้ไขปัญหาหรือพัฒนาการเรียนรู้ที่ส่งผลต่อคุณภาพผู้เรียน และนำผลการศึกษา วิเคราะห์ และสังเคราะห์ มาใช้แก้ไขปัญหาหรือพัฒนาคุณภาพการจัดการเรียนรู้ให้สูงขึ้น และเป็นแบบอย่างที่ดีในการศึกษา วิเคราะห์ และสังเคราะห์ เพื่อแก้ไขปัญหาหรือพัฒนาการเรียนรู้',1.00,4,6
  UNION ALL SELECT 'TOP1','1.7','จัดบรรยากาศที่ส่งเสริมและพัฒนาผู้เรียน','มีการริเริ่ม คิดค้น และพัฒนาการจัดบรรยากาศที่เหมาะสม สอดคล้องกับความแตกต่างผู้เรียนเป็นรายบุคคล สามารถแก้ไขปัญหาการเรียนรู้ และสร้างแรงบันดาลใจ ส่งเสริมและพัฒนาผู้เรียนให้เกิดกระบวนการคิด ทักษะชีวิต ทักษะการทำงาน ทักษะการเรียนรู้และนวัตกรรม ทักษะด้านสารสนเทศ สื่อ และเทคโนโลยี และเป็นแบบอย่างที่ดีในการจัดบรรยากาศที่ส่งเสริมและพัฒนาผู้เรียน',1.00,4,7
  UNION ALL SELECT 'TOP1','1.8','อบรมและพัฒนาคุณลักษณะที่ดีของผู้เรียน','มีการอบรมบ่มนิสัยให้ผู้เรียนมีคุณธรรม จริยธรรม คุณลักษณะอันพึงประสงค์ และค่านิยมความเป็นไทยที่ดีงาม โดยริเริ่ม คิดค้น และพัฒนารูปแบบการดำเนินการที่มีประสิทธิภาพ คำนึงถึงความแตกต่างของผู้เรียนเป็นรายบุคคล และสามารถแก้ไขปัญหาและพัฒนาผู้เรียนได้ และเป็นแบบอย่างที่ดีในการอบรมและพัฒนาคุณลักษณะที่ดีของผู้เรียน',1.00,4,8

  UNION ALL SELECT 'TOP2','2.1','จัดทำข้อมูลสารสนเทศของผู้เรียนและรายวิชา','มีการริเริ่ม คิดค้น และพัฒนารูปแบบการจัดทำข้อมูลสารสนเทศของผู้เรียนและรายวิชา ให้มีข้อมูลเป็นปัจจุบัน เพื่อใช้ในการส่งเสริมสนับสนุนการเรียนรู้ แก้ไขปัญหาและพัฒนาคุณภาพผู้เรียน และเป็นแบบอย่างที่ดี',1.00,4,9
  UNION ALL SELECT 'TOP2','2.2','ดำเนินการตามระบบดูแลช่วยเหลือผู้เรียน','มีการใช้ข้อมูลสารสนเทศเกี่ยวกับผู้เรียนรายบุคคล และประสานความร่วมมือกับผู้มีส่วนเกี่ยวข้อง เพื่อพัฒนาและแก้ไขปัญหาผู้เรียน และริเริ่มโครงการหรือจัดกิจกรรมเชิงสร้างสรรค์ด้วยวิธีการที่หลากหลายในการดูแลช่วยเหลือผู้เรียน และเป็นแบบอย่างที่ดี',1.00,4,10
  UNION ALL SELECT 'TOP2','2.3','ปฏิบัติงานวิชาการ และงานอื่น ๆ ของสถานศึกษา','ร่วมปฏิบัติงานทางวิชาการ และงานอื่น ๆ ของสถานศึกษา เพื่อยกระดับคุณภาพการจัดการศึกษาของสถานศึกษา โดยมีการพัฒนารูปแบบหรือแนวทางการดำเนินงานให้มีประสิทธิภาพสูงขึ้น และเป็นแบบอย่างที่ดี',1.00,4,11
  UNION ALL SELECT 'TOP2','2.4','ประสานความร่วมมือกับผู้ปกครอง ภาคีเครือข่าย และหรือสถานประกอบการ','การประสานความร่วมมือกับผู้ปกครอง ภาคีเครือข่าย และหรือสถานประกอบการ เพื่อร่วมกันแก้ไขปัญหาและพัฒนาผู้เรียน และเป็นแบบอย่างที่ดี',1.00,4,12

  UNION ALL SELECT 'TOP3','3.1','พัฒนาตนเองอย่างเป็นระบบและต่อเนื่อง','พัฒนาตนเองอย่างเป็นระบบและต่อเนื่อง เพื่อให้มีความรู้ ความสามารถ ทักษะ โดยเฉพาะอย่างยิ่งการใช้ภาษาไทยและภาษาอังกฤษเพื่อการสื่อสาร และการใช้เทคโนโลยีดิจิทัลเพื่อการศึกษา สมรรถนะวิชาชีพครูและความรอบรู้ในเนื้อหาวิชาและวิธีการสอน และเป็นแบบอย่างที่ดี',1.00,4,13
  UNION ALL SELECT 'TOP3','3.2','มีส่วนร่วมและเป็นผู้นำในการแลกเปลี่ยนเรียนรู้ทางวิชาชีพ','มีส่วนร่วม และเป็นผู้นำในการแลกเปลี่ยนเรียนรู้ทางวิชาชีพ เพื่อแก้ไขปัญหาและสร้างนวัตกรรมเพื่อพัฒนาการจัดการเรียนรู้ และเป็นแบบอย่างที่ดี',1.00,4,14
  UNION ALL SELECT 'TOP3','3.3','นำความรู้ ความสามารถ ทักษะที่ได้จากการพัฒนาตนเองและวิชาชีพมาใช้','นำความรู้ ความสามารถ ทักษะที่ได้จากการพัฒนาตนเองและวิชาชีพมาใช้ในการพัฒนาการจัดการเรียนรู้ การพัฒนาคุณภาพผู้เรียน รวมถึงการพัฒนานวัตกรรมการจัดการเรียนรู้ที่มีผลต่อคุณภาพผู้เรียน และเป็นแบบอย่างที่ดี',1.00,4,15

  UNION ALL SELECT 'TOP4','CH-1','วิธีดำเนินการ (20 คะแนน)','พิจารณาจากการดำเนินการที่ถูกต้อง ครบถ้วน เป็นไปตามระยะเวลาที่กำหนดไว้ในข้อตกลง และสะท้อนให้เห็นถึงระดับการปฏิบัติที่คาดหวังตามตำแหน่งและวิทยฐานะ',2.00,4,16
  UNION ALL SELECT 'TOP4','CH-2.1','ผลลัพธ์การเรียนรู้ของผู้เรียน: เชิงปริมาณ (10 คะแนน)','พิจารณาจากการบรรลุเป้าหมายเชิงปริมาณได้ครบถ้วนตามข้อตกลง และมีความถูกต้อง เชื่อถือได้',1.00,4,17
  UNION ALL SELECT 'TOP4','CH-2.2','ผลลัพธ์การเรียนรู้ของผู้เรียน: เชิงคุณภาพ (10 คะแนน)','พิจารณาจากการบรรลุเป้าหมายเชิงคุณภาพได้ครบถ้วน ถูกต้อง เชื่อถือได้ และปรากฏผลต่อคุณภาพผู้เรียนได้ตามข้อตกลง',1.00,4,18

  UNION ALL SELECT 'TOP5','P-1','ความสำเร็จของงานที่ได้รับมอบหมายจากผู้บังคับบัญชา','ระดับ 1 = แล้วเสร็จต่ำกว่าร้อยละ 20, ระดับ 2 = ร้อยละ 20.00-39.99, ระดับ 3 = ร้อยละ 40.00-59.99, ระดับ 4 = ร้อยละ 60.00-79.99, ระดับ 5 = ร้อยละ 80 ขึ้นไป (คะแนน = ระดับ x 2)',1.00,5,19

  UNION ALL SELECT 'TOP6','ETH-01','ยึดมั่นในสถาบันหลักของประเทศ','ยึดมั่นในสถาบันหลักของประเทศ อันได้แก่ ชาติ ศาสนา พระมหากษัตริย์ และการปกครองระบอบประชาธิปไตยอันมีพระมหากษัตริย์ทรงเป็นประมุข',1.00,4,20
  UNION ALL SELECT 'TOP6','ETH-02','มีความซื่อสัตย์ สุจริต มีจิตสำนึกที่ดี','มีความซื่อสัตย์ สุจริต มีจิตสำนึกที่ดี มีความรับผิดชอบต่อหน้าที่และต่อผู้เกี่ยวข้องในฐานะข้าราชการครูและบุคลากรทางการศึกษา',1.00,4,21
  UNION ALL SELECT 'TOP6','ETH-03','มีความกล้าคิด กล้าตัดสินใจ กล้าแสดงออก','มีความกล้าคิด กล้าตัดสินใจ กล้าแสดงออก และกระทำในสิ่งที่ถูกต้อง ชอบธรรม',1.00,4,22
  UNION ALL SELECT 'TOP6','ETH-04','มีจิตอาสา จิตสาธารณะ','มีจิตอาสา จิตสาธารณะ มุ่งประโยชน์ส่วนรวม โดยไม่คำนึงถึงประโยชน์ส่วนตนหรือพวกพ้อง',1.00,4,23
  UNION ALL SELECT 'TOP6','ETH-05','มุ่งผลสัมฤทธิ์ของงาน','มุ่งผลสัมฤทธิ์ของงาน มุ่งมั่นในการปฏิบัติงานอย่างเต็มกำลังความสามารถ โดยคำนึงถึงคุณภาพการศึกษาเป็นสำคัญ',1.00,4,24
  UNION ALL SELECT 'TOP6','ETH-06','ปฏิบัติหน้าที่อย่างเป็นธรรมและไม่เลือกปฏิบัติ','ปฏิบัติหน้าที่อย่างเป็นธรรมและไม่เลือกปฏิบัติ',1.00,4,25
  UNION ALL SELECT 'TOP6','ETH-07','ดำรงตนเป็นแบบอย่างที่ดี','ดำรงตนเป็นแบบอย่างที่ดีและรักษาภาพลักษณ์ของข้าราชการครูและบุคลากรทางการศึกษา',1.00,4,26
  UNION ALL SELECT 'TOP6','ETH-08','เคารพศักดิ์ศรีความเป็นมนุษย์','เคารพศักดิ์ศรีความเป็นมนุษย์ คำนึงถึงสิทธิเด็ก และยอมรับความแตกต่างของบุคคล',1.00,4,27
  UNION ALL SELECT 'TOP6','ETH-09','ยึดถือและปฏิบัติตามจรรยาบรรณของวิชาชีพ','ยึดถือและปฏิบัติตามจรรยาบรรณของวิชาชีพ',1.00,4,28
  UNION ALL SELECT 'TOP6','ETH-10','มีวินัยและการรักษาวินัย','มีวินัยและการรักษาวินัย',1.00,4,29
) x ON x.topic = t.code
ORDER BY x.ord;

-- Evidence types (ชนิดหลักฐาน)
INSERT INTO evidence_types (code, name_th, description) VALUES
('E-CURR','หลักสูตร/รายวิชา/หน่วยการเรียนรู้','โครงสร้างรายวิชา หน่วยการเรียนรู้ การปรับปรุงหลักสูตร'),
('E-PLAN','แผนการจัดการเรียนรู้','แผนการสอน/แผนการจัดการเรียนรู้ที่เน้นผู้เรียนเป็นสำคัญ'),
('E-ACT','บันทึกหลังสอน/ภาพกิจกรรมการเรียนรู้','บันทึกหลังการสอน ภาพ/คลิปกิจกรรม ผลงานผู้เรียน'),
('E-MEDIA','สื่อ นวัตกรรม เทคโนโลยี','สื่อการสอน นวัตกรรม แหล่งเรียนรู้ และผลการใช้'),
('E-ASSESS','เครื่องมือและผลการวัดประเมินผล','ข้อสอบ รูบริก แบบประเมินตามสภาพจริง บันทึกคะแนน'),
('E-RESEARCH','วิจัยในชั้นเรียน/รายงานการศึกษา','รายงานการศึกษา วิเคราะห์ สังเคราะห์ วิจัยในชั้นเรียน'),
('E-CLASS','การจัดบรรยากาศชั้นเรียน','ภาพห้องเรียน ป้ายนิเทศ ข้อตกลงชั้นเรียน'),
('E-MORAL','การพัฒนาคุณลักษณะผู้เรียน','กิจกรรมโฮมรูม อบรมคุณธรรม บันทึกพฤติกรรม'),
('E-INFO','ข้อมูลสารสนเทศผู้เรียน/รายวิชา','ฐานข้อมูลผู้เรียน สถิติผลการเรียน ระบบสารสนเทศ'),
('E-CARE','ระบบดูแลช่วยเหลือผู้เรียน','บันทึกเยี่ยมบ้าน SDQ บันทึกการให้คำปรึกษา โครงการช่วยเหลือ'),
('E-ORDER','คำสั่ง/หลักฐานการปฏิบัติงานของสถานศึกษา','คำสั่งแต่งตั้ง รายงานผลการปฏิบัติงานวิชาการ/งานอื่น'),
('E-NETWORK','ความร่วมมือผู้ปกครอง/ภาคีเครือข่าย/สถานประกอบการ','บันทึกการประชุม MOU ทวิภาคี ภาพกิจกรรม'),
('E-CERT','เกียรติบัตร/วุฒิบัตรการพัฒนาตนเอง','เกียรติบัตรการอบรม สัมมนา ศึกษาดูงาน ผลการทดสอบภาษา/ดิจิทัล'),
('E-PLC','บันทึกการแลกเปลี่ยนเรียนรู้ (PLC)','บันทึก PLC ชุมชนการเรียนรู้ทางวิชาชีพ'),
('E-APPLY','รายงานการนำความรู้ไปใช้','รายงานการนำผลการพัฒนาตนเองไปใช้ในการจัดการเรียนรู้'),
('E-PA','ข้อตกลงและรายงานผล PA','แบบข้อตกลง PA (PA1) และรายงานผลการดำเนินงานประเด็นท้าทาย'),
('E-RESULT','ผลลัพธ์การเรียนรู้ของผู้เรียน','สถิติ/ผลสัมฤทธิ์ ผลงานผู้เรียนตามเป้าหมายเชิงปริมาณและคุณภาพ'),
('E-WORK','รายงานผลงานที่ได้รับมอบหมาย','สรุปงานที่ได้รับมอบหมายและร้อยละที่แล้วเสร็จ'),
('E-ETHICS','หลักฐานการปฏิบัติตนตามวินัย/จรรยาบรรณ','บันทึกการปฏิบัติตน เกียรติบัตร จิตอาสา (ถ้ามี)');

-- Indicator ↔ Evidence mapping
INSERT INTO indicator_evidence (indicator_id, evidence_type_id)
SELECT i.id, e.id FROM indicators i JOIN evidence_types e ON (i.code, e.code) IN (
  ('1.1','E-CURR'), ('1.2','E-PLAN'), ('1.3','E-PLAN'), ('1.3','E-ACT'), ('1.4','E-MEDIA'),
  ('1.5','E-ASSESS'), ('1.6','E-RESEARCH'), ('1.7','E-CLASS'), ('1.8','E-MORAL'),
  ('2.1','E-INFO'), ('2.2','E-CARE'), ('2.3','E-ORDER'), ('2.4','E-NETWORK'),
  ('3.1','E-CERT'), ('3.2','E-PLC'), ('3.3','E-APPLY'),
  ('CH-1','E-PA'), ('CH-2.1','E-PA'), ('CH-2.1','E-RESULT'), ('CH-2.2','E-PA'), ('CH-2.2','E-RESULT'),
  ('P-1','E-WORK'), ('P-1','E-ORDER')
);
INSERT INTO indicator_evidence (indicator_id, evidence_type_id)
SELECT i.id, e.id FROM indicators i JOIN evidence_types e ON e.code = 'E-ETHICS' WHERE i.code LIKE 'ETH-%';

-- Assignments
INSERT INTO assignments (period_id, evaluator_id, evaluatee_id, dept_id)
SELECT p.id, er.id, ee.id, ee.department_id
FROM evaluation_periods p
JOIN (
  SELECT 'eva.it@ccollege.ac.th' er, 't.it01@ccollege.ac.th' ee
  UNION ALL SELECT 'eva.me@ccollege.ac.th', 't.me01@ccollege.ac.th'
  UNION ALL SELECT 'eva.it@ccollege.ac.th', 't.acc01@ccollege.ac.th'
) m
JOIN users er ON er.email = m.er
JOIN users ee ON ee.email = m.ee
WHERE p.code = 'R2-2569';

-- View
CREATE OR REPLACE VIEW v_evidence_progress AS
SELECT
  u.name_th AS evaluatee_name,
  d.name_th AS dept_name,
  p.buddhist_year,
  t.title_th AS topic_title,
  i.code AS indicator_code,
  i.name_th AS indicator_name,
  COUNT(a.id) AS files_uploaded
FROM users u
JOIN departments d ON d.id = u.department_id
JOIN assignments s ON s.evaluatee_id = u.id
JOIN evaluation_periods p ON p.id = s.period_id AND p.is_active = 1
JOIN indicators i ON 1=1
JOIN evaluation_topics t ON t.id = i.topic_id
LEFT JOIN attachments a
  ON a.indicator_id = i.id
 AND a.evaluatee_id = u.id
 AND a.period_id = p.id
WHERE u.role = 'evaluatee'
GROUP BY u.name_th, d.name_th, p.buddhist_year, t.title_th, i.code, i.name_th
ORDER BY u.name_th, t.title_th, i.code;
