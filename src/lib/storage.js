// Lưu trữ localStorage: dữ liệu lớp đã import + các phương án xếp TKB

const KEY_DATA = 'dkhp.classes.v1'   // danh sách lớp đã parse (để khôi phục sau khi F5)
const KEY_PLANS = 'dkhp.plans.v1'    // các phương án
const KEY_ACTIVE = 'dkhp.activePlan.v1'
const KEY_FILENAME = 'dkhp.filename.v1'

export function loadClasses() {
  try {
    const raw = localStorage.getItem(KEY_DATA)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
export function saveClasses(classes) {
  try {
    localStorage.setItem(KEY_DATA, JSON.stringify(classes))
  } catch (e) {
    console.warn('Không lưu được dữ liệu lớp (có thể vượt dung lượng localStorage).', e)
  }
}
export function loadFilename() {
  return localStorage.getItem(KEY_FILENAME) || ''
}
export function saveFilename(name) {
  localStorage.setItem(KEY_FILENAME, name || '')
}

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 9)
}

export function defaultPlans() {
  const id = uid()
  return {
    plans: [{ id, name: 'Phương án 1', selected: [] }],
    activeId: id,
  }
}

export function loadPlans() {
  try {
    const raw = localStorage.getItem(KEY_PLANS)
    const activeId = localStorage.getItem(KEY_ACTIVE)
    if (!raw) return defaultPlans()
    const plans = JSON.parse(raw)
    if (!Array.isArray(plans) || plans.length === 0) return defaultPlans()
    return {
      plans,
      activeId: plans.some((p) => p.id === activeId) ? activeId : plans[0].id,
    }
  } catch {
    return defaultPlans()
  }
}

export function savePlans(plans, activeId) {
  localStorage.setItem(KEY_PLANS, JSON.stringify(plans))
  localStorage.setItem(KEY_ACTIVE, activeId)
}

export { uid }
