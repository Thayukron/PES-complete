// เปิดดู/ดาวน์โหลดไฟล์หลักฐาน (ต้องส่ง token จึงโหลดผ่าน axios แล้วสร้าง blob URL)
export function useAttachment() {
  const { $api } = useNuxtApp()
  const notify = useNotify()

  async function fetchBlob(file, inline) {
    const { data } = await $api.get(`/api/attachments/${file.id}/file`, {
      params: inline ? { inline: 1 } : {},
      responseType: 'blob',
    })
    return data
  }

  async function view(file) {
    // เปิดแท็บไว้ก่อน (กัน popup blocker) แล้วค่อยใส่ไฟล์
    const win = window.open('', '_blank')
    try {
      const blob = await fetchBlob(file, true)
      const url = URL.createObjectURL(new Blob([blob], { type: file.mime_type }))
      if (win) win.location.href = url
      else window.location.href = url
    } catch (e) {
      win?.close()
      notify.error('ไม่สามารถเปิดไฟล์ได้')
    }
  }

  async function download(file) {
    try {
      saveBlob(await fetchBlob(file, false), file.file_name)
    } catch (e) {
      notify.error('ไม่สามารถดาวน์โหลดไฟล์ได้')
    }
  }

  const canPreview = (file) => /^(application\/pdf|image\/)/.test(file.mime_type)
  return { view, download, canPreview }
}
