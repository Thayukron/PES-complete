// กล่องยืนยันก่อนทำรายการสำคัญ: if (await useConfirm()({ title, text })) { ... }
export function useConfirmState() {
  return useState('confirm', () => ({ show: false, title: '', text: '', okText: 'ยืนยัน', color: 'primary', resolve: null }))
}

export function useConfirm() {
  const state = useConfirmState()
  return ({ title = 'ยืนยันการทำรายการ', text = '', okText = 'ยืนยัน', color = 'primary' } = {}) =>
    new Promise((resolve) => {
      state.value = { show: true, title, text, okText, color, resolve }
    })
}
