import * as XLSX from 'xlsx'
import { parseTiet, parseThu } from './tiet.js'

// Chuẩn hóa tên cột (bỏ dấu cách thừa, in hoa) để dò header linh hoạt
function norm(s) {
  return String(s ?? '').trim().toUpperCase().replace(/\s+/g, ' ')
}

// Bản đồ header -> khóa nội bộ. Chấp nhận vài biến thể tên cột.
const HEADER_MAP = {
  'STT': 'stt',
  'MÃ MH': 'maMH',
  'MÃ MÔN HỌC': 'maMH',
  'MÃ LỚP': 'maLop',
  'TÊN MÔN HỌC': 'tenMH',
  'MÃ GIẢNG VIÊN': 'maGV',
  'TÊN GIẢNG VIÊN': 'tenGV',
  'TÊN TRỢ GIẢNG': 'tenGV',
  'SĨ SỐ': 'siSo',
  'SỐ TC': 'soTC',
  'THỰC HÀNH': 'thucHanh',
  'HTGD': 'htgd',
  'THỨ': 'thu',
  'TIẾT': 'tiet',
  'CÁCH TUẦN': 'cachTuan',
  'PHÒNG HỌC': 'phong',
  'KHÓA HỌC': 'khoa',
}

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i].map(norm)
    if (cells.includes('MÃ LỚP') && (cells.includes('THỨ') || cells.includes('TIẾT'))) {
      return i
    }
  }
  return -1
}

function parseSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
  const headerIdx = findHeaderRow(rows)
  if (headerIdx === -1) return []

  const header = rows[headerIdx].map(norm)
  const colIndex = {}
  header.forEach((h, idx) => {
    const key = HEADER_MAP[h]
    if (key && colIndex[key] === undefined) colIndex[key] = idx
  })
  if (colIndex.maLop === undefined) return []

  const out = []
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    const get = (k) => (colIndex[k] !== undefined ? row[colIndex[k]] : null)
    const maLop = get('maLop')
    if (maLop == null || String(maLop).trim() === '') continue

    const thu = parseThu(get('thu'))
    const tiets = parseTiet(get('tiet'))
    const soTCraw = get('soTC')
    const soTC = soTCraw == null || soTCraw === '' ? 0 : Number(soTCraw) || 0

    out.push({
      id: String(maLop).trim(),
      maLop: String(maLop).trim(),
      maMH: String(get('maMH') ?? '').trim(),
      tenMH: String(get('tenMH') ?? '').trim(),
      tenGV: String(get('tenGV') ?? '').trim(),
      soTC,
      htgd: String(get('htgd') ?? '').trim(),
      thu, // số 2..7 hoặc null
      tiets, // mảng số tiết, [] nếu không có giờ
      phong: String(get('phong') ?? '').trim(),
      siSo: get('siSo') == null ? '' : String(Number(get('siSo')) || get('siSo')),
    })
  }
  return out
}

// Đọc file (ArrayBuffer) -> danh sách lớp gộp tất cả sheet, khử trùng theo id
export function parseWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const all = []
  const seen = new Set()
  for (const name of wb.SheetNames) {
    const classes = parseSheet(wb.Sheets[name])
    for (const c of classes) {
      let id = c.id
      // nếu trùng id giữa các sheet, thêm hậu tố để không mất dữ liệu
      if (seen.has(id)) id = `${id}#${name}`
      seen.add(id)
      all.push({ ...c, id })
    }
  }
  return all
}
