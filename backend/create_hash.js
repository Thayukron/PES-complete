// สร้าง bcrypt hash สำหรับใส่ในฐานข้อมูลด้วยมือ
// ใช้: node create_hash.js "รหัสผ่านที่ต้องการ"
const bcrypt = require('bcrypt');

const password = process.argv[2];
if (!password) {
  console.error('ใช้: node create_hash.js "<password>"');
  process.exit(1);
}
bcrypt.hash(password, 10).then((hash) => console.log(hash));
