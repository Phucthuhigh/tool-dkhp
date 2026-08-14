// Bảng giờ học UIT (tiết 1..10)
export const TIET_TIME = {
  1: ['7:30', '8:15'],
  2: ['8:15', '9:00'],
  3: ['9:00', '9:45'],
  4: ['10:00', '10:45'],
  5: ['10:45', '11:30'],
  6: ['13:00', '13:45'],
  7: ['13:45', '14:30'],
  8: ['14:30', '15:15'],
  9: ['15:30', '16:15'],
  10: ['16:15', '17:00'],
}

export const TIET_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Thứ 2..7 (không có Chủ nhật trong dữ liệu UIT)
export const DAYS = [
  { key: 2, label: 'Thứ 2' },
  { key: 3, label: 'Thứ 3' },
  { key: 4, label: 'Thứ 4' },
  { key: 5, label: 'Thứ 5' },
  { key: 6, label: 'Thứ 6' },
  { key: 7, label: 'Thứ 7' },
]

// Parse chuỗi tiết dạng nối "123", "678910", "12345" -> [1,2,3], [6,7,8,9,10], ...
// Chỉ có "10" là số 2 chữ số; các tiết còn lại 1 chữ số.
export function parseTiet(raw) {
  if (raw == null) return []
  const s = String(raw).trim()
  if (!s || s === '*') return []
  const out = []
  let i = 0
  while (i < s.length) {
    if (s[i] === '1' && s[i + 1] === '0') {
      out.push(10)
      i += 2
    } else if (s[i] >= '1' && s[i] <= '9') {
      out.push(Number(s[i]))
      i += 1
    } else {
      i += 1 // bỏ ký tự lạ
    }
  }
  return out
}

// Parse thứ: "2".."7" -> số; "*" hoặc rỗng -> null (không có giờ cố định)
export function parseThu(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  const n = Number(s)
  if (Number.isInteger(n) && n >= 2 && n <= 7) return n
  return null
}

// Định dạng tiết cho hiển thị: [1,2,3] -> "1-3"; [1,3] -> "1,3"
export function formatTiet(tiets) {
  if (!tiets || tiets.length === 0) return '—'
  const sorted = [...tiets].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let k = 1; k < sorted.length; k++) {
    if (sorted[k] === prev + 1) {
      prev = sorted[k]
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
      start = prev = sorted[k]
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
  return ranges.join(',')
}

// Hai lớp có trùng lịch không (cùng thứ + giao nhau tiết)
export function isConflict(a, b) {
  if (a.thu == null || b.thu == null) return false
  if (a.thu !== b.thu) return false
  const setB = new Set(b.tiets)
  return a.tiets.some((t) => setB.has(t))
}
