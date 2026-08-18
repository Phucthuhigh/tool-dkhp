// Liên kết lớp Lý thuyết (LT) và Thực hành (TH) theo mã lớp.
// Quy ước UIT: mã lớp TH = mã lớp LT + ".<nhóm>", ví dụ:
//   LT: IT007.R19  ->  TH: IT007.R19.1 hoặc IT007.R19.2

const TH_HTGD = new Set(['HT1', 'HT2'])

export function isLT(c) {
  return c.htgd === 'LT'
}
export function isTH(c) {
  return TH_HTGD.has(c.htgd)
}

// Bóc tách mã nhóm từ mã lớp. Ví dụ:
// NT209.R11.ANTT -> R11
// NT209.R11.1 -> R11
// IT007.R19 -> R19
// SE104.CLCLC.1 -> CLCLC
export function getGroupCode(code) {
  if (!code) return ''
  const parts = String(code).trim().split('.')
  if (parts.length > 1) {
    return parts[1].trim().toUpperCase()
  }
  return parts[0].trim().toUpperCase()
}

// Kiểm tra lớp TH có thuộc đúng lớp LT (cùng môn + cùng nhóm/mã cha)
export function isChildOf(thClass, ltClass) {
  if (!isTH(thClass) || !isLT(ltClass)) return false
  if (thClass.maMH !== ltClass.maMH) return false

  // Lớp Thực hành chỉ được ghép với lớp Lý thuyết cùng nhóm/cùng mã cha
  const thGroup = getGroupCode(thClass.maLop)
  const ltGroup = getGroupCode(ltClass.maLop)
  if (thGroup !== ltGroup) return false

  // Nếu có cột maLopLT tường minh
  if (thClass.maLopLT && String(thClass.maLopLT).trim()) {
    return String(thClass.maLopLT).trim() === ltClass.maLop
  }

  return true
}

// Kiểm tra lớp có khớp khóa học (K20, K19...) hay không.
// QUAN TRỌNG: Ô trống cột khoaDKHP / khoa có nghĩa là mở chung cho tất cả các khóa.
export function matchKhoaFilter(c, studentCohort) {
  if (!studentCohort) return true
  const rawList = c.khoaDKHP || c.khoa
  if (!rawList || String(rawList).trim() === '') return true

  const list = String(rawList).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  const cohortClean = String(studentCohort).trim().toUpperCase()
  const cohortNum = cohortClean.replace(/^K/i, '')

  return list.some((k) => {
    const kClean = k.trim().toUpperCase()
    const kNum = kClean.replace(/^K/i, '')
    return kClean === cohortClean || kNum === cohortNum || kClean === `K${cohortNum}`
  })
}

// Bỏ đoạn cuối sau dấu chấm: "IT007.R19.1" -> "IT007.R19"
export function stripLastSeg(code) {
  const i = code.lastIndexOf('.')
  return i > 0 ? code.slice(0, i) : code
}

// Map mã lớp -> lớp (để tra cứu nhanh)
export function buildIndex(classes) {
  const byCode = new Map()
  for (const c of classes) byCode.set(c.maLop, c)
  return byCode
}

// Với một lớp TH, trả về mã lớp LT cha nếu tồn tại; ngược lại null.
// Ưu tiên cột "MA LOP LT" tường minh từ file (nếu có) — chính xác hơn việc đoán qua
// hậu tố ".n" cuối mã lớp, rồi mới rơi về cách đoán cũ cho các file chưa có cột này.
export function parentLTCode(c, byCode) {
  if (!isTH(c)) return null
  const explicit = c.maLopLT && String(c.maLopLT).trim()
  if (explicit) {
    const explicitParent = byCode.get(explicit)
    if (explicitParent && isLT(explicitParent)) return explicit
  }
  const p = stripLastSeg(c.maLop)
  const parent = byCode.get(p)
  return parent && isLT(parent) ? p : null
}

// "Họ" của lớp: LT -> chính nó; TH -> mã LT cha; khác -> null
export function familyOf(c, byCode) {
  if (isLT(c)) return c.maLop
  if (isTH(c)) return parentLTCode(c, byCode)
  return null
}

// Hai lớp không thể cùng chọn trong một môn (cùng maMH):
//  - Hai lớp LT cùng môn  -> chỉ được chọn 1 (vd đã chọn IT007.R110 thì IT007.R111 bị khóa).
//  - Một LT một TH khác "họ" -> không khớp (đã chọn LT IT007.R110 thì TH IT007.R111.1 bị khóa).
//  - Hai lớp TH khác "họ"  -> không khớp.
export function familyIncompatible(a, b, byCode) {
  if (a.maMH !== b.maMH) return false
  const aLT = isLT(a), bLT = isLT(b), aTH = isTH(a), bTH = isTH(b)
  if (!(aLT || aTH) || !(bLT || bTH)) return false // bỏ qua ĐA/KLTN/TTTN…
  if (aLT && bLT) return true // hai LT cùng môn: chỉ 1
  const fa = familyOf(a, byCode)
  const fb = familyOf(b, byCode)
  if (fa == null || fb == null) return false
  return fa !== fb
}

// Lý do bị khóa (để hiển thị) giữa lớp ứng viên c và lớp đã chọn sc.
export function incompatReason(c, sc) {
  if (isLT(c) && isLT(sc)) {
    return `Đã chọn lớp LT khác của môn ${c.maMH} (${sc.maLop})`
  }
  return `Không khớp lớp ${isLT(sc) ? 'LT' : 'TH'} đã chọn (${sc.maLop}) của môn ${c.maMH}`
}
