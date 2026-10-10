# PES Frontend (Nuxt 3 + Vuetify 3)

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit test (vitest)
npm run build   # สร้าง .output สำหรับ production -> node .output/server/index.mjs
```

- โหมด SPA (`ssr: false`) — ข้อมูลล็อกอินเก็บใน localStorage
- ทุกคำขอ `/api/**` ถูกส่งต่อไปที่ Backend ผ่าน `server/api/[...path].ts`
  ปลายทางกำหนดด้วย env `NUXT_API_INTERNAL` (ค่าเริ่มต้น `http://localhost:7000`)
- สิทธิ์ของหน้า: `definePageMeta({ roles: ['admin'] })` ตรวจโดย `middleware/auth.global.js`
- เมนูตามบทบาท: `composables/useMenu.js`

ดูภาพรวมทั้งระบบที่ [README หลัก](../README.md)
