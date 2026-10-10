// เมนูด้านซ้ายตามบทบาทผู้ใช้
const MENUS = {
  admin: [
    { label: 'หน้าหลัก', items: [{ label: 'แดชบอร์ด', to: '/', icon: 'mdi-view-dashboard-outline' }] },
    {
      label: 'การประเมิน',
      items: [
        { label: 'ติดตามความคืบหน้า', to: '/admin/monitor', icon: 'mdi-progress-check' },
        { label: 'รายงานผลการประเมิน', to: '/admin/reports', icon: 'mdi-chart-box-outline' },
        { label: 'จับคู่กรรมการ', to: '/admin/assignments', icon: 'mdi-account-multiple-check-outline' },
      ],
    },
    {
      label: 'ตั้งค่าระบบ',
      items: [
        { label: 'ผู้ใช้งาน', to: '/admin/users', icon: 'mdi-account-cog-outline' },
        { label: 'รอบการประเมิน', to: '/admin/periods', icon: 'mdi-calendar-range' },
        { label: 'ด้านและตัวชี้วัด', to: '/admin/topics', icon: 'mdi-format-list-checks' },
        { label: 'ข้อมูลพื้นฐาน', to: '/admin/settings', icon: 'mdi-cog-outline' },
        { label: 'API Docs', href: '/docs/', icon: 'mdi-book-open-variant' },
      ],
    },
  ],
  evaluator: [
    { label: 'หน้าหลัก', items: [{ label: 'แดชบอร์ด', to: '/', icon: 'mdi-view-dashboard-outline' }] },
    {
      label: 'งานประเมิน',
      items: [
        { label: 'รายชื่อผู้รับการประเมิน', to: '/eval/tasks', icon: 'mdi-clipboard-account-outline' },
        { label: 'สรุปผลการประเมิน', to: '/eval/results', icon: 'mdi-file-chart-outline' },
      ],
    },
  ],
  evaluatee: [
    { label: 'หน้าหลัก', items: [{ label: 'แดชบอร์ด', to: '/', icon: 'mdi-view-dashboard-outline' }] },
    {
      label: 'การประเมินของฉัน',
      items: [
        { label: 'ตัวชี้วัด', to: '/me/indicators', icon: 'mdi-format-list-bulleted-square' },
        { label: 'อัปโหลดหลักฐาน', to: '/me/evidence', icon: 'mdi-tray-arrow-up' },
        { label: 'ประเมินตนเอง', to: '/me/self-assessment', icon: 'mdi-star-check-outline' },
        { label: 'ความคืบหน้า', to: '/me/progress', icon: 'mdi-progress-clock' },
        { label: 'ผลการประเมินและข้อเสนอแนะ', to: '/me/results', icon: 'mdi-message-text-outline' },
        { label: 'พิมพ์/ส่งออกรายงาน', to: '/report/me', icon: 'mdi-printer-outline' },
      ],
    },
  ],
}

export function useMenu() {
  const auth = useAuthStore()
  return computed(() => MENUS[auth.role] || [])
}
