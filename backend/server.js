// server.js — จุดเริ่มต้นของ API
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}  (docs: /docs)`);
});
