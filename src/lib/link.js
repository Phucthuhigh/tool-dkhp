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
export function parentLTCode(c, byCode) {
  if (!isTH(c)) return null
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
