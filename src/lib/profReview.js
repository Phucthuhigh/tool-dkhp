import * as XLSX from 'xlsx'

// Key lưu cache review trong localStorage
const PROF_CACHE_KEY = 'dkhp.profReviews.v2'
const DEFAULT_PROF_SUMMARY = 'Giảng viên chưa có đánh giá, coi là túi mù.'

// Memory Cache
let profDataStore = null

export function normName(name) {
  if (!name) return ''
  return String(name)
    .trim()
    .toUpperCase()
    .replace(/^(THS|TS|PGS|GS|BS|NCS)\.?\s+/gi, '')
    .replace(/\s*\(.*\)/g, '')
    .replace(/\s+/g, ' ')
}

export function normalizeGV(name) {
  return normName(name)
}

export function loadStoredProfData() {
  if (profDataStore) return profDataStore
  try {
    const raw = localStorage.getItem(PROF_CACHE_KEY)
    if (raw) {
      profDataStore = JSON.parse(raw)
      return profDataStore
    }
  } catch (e) {
    console.error('Lỗi đọc cache prof review:', e)
  }
  profDataStore = {}
  return profDataStore
}

export function saveProfData(data) {
  profDataStore = data
  try {
    localStorage.setItem(PROF_CACHE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Lỗi lưu prof review cache:', e)
  }
}

// Parse dữ liệu từ File Excel professor_reviews_formatted.xlsx
export function parseProfWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const store = {}

  // Quét toàn bộ các Sheet trong file Excel để gom dữ liệu
  wb.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName])
    rows.forEach((r) => {
      const gvRaw = r['Giảng viên'] || r['Tên giảng viên'] || r['TENGV'] || r['GV']
      if (!gvRaw) return
      const key = normName(gvRaw)
      if (!key) return

      const rawRating = Number(
        r['Rating (Everytime)'] ||
          r['Điểm cảm nhận (1-5)'] ||
          r['Điểm trung bình'] ||
          r['Số sao'] ||
          r['Rating'] ||
          r['Điểm']
      )
      const rating = Number.isFinite(rawRating) ? rawRating : null

      const subject = String(r['Môn học'] || r['Tên môn học'] || r['Môn'] || '').trim()
      const semester = String(r['Học kỳ'] || r['Học kỳ / Năm học'] || r['HK'] || '').trim()
      const comment = String(
        r['Nội dung review'] || r['Nội dung'] || r['Bình luận'] || r['Review'] || r['Nhận xét'] || ''
      ).trim()

      if (!store[key]) {
        store[key] = {
          tenGV: String(gvRaw).trim(),
          rating: null,
          totalReviews: 0,
          summary: '',
          reviews: [],
        }
      }

      // Nếu có nội dung review chi tiết
      if (comment) {
        const exists = store[key].reviews.some(
          (rev) => rev.comment === comment && rev.subject === subject
        )
        if (!exists) {
          store[key].reviews.push({ rating, subject, semester, comment })
        }
      }
    })
  })

  // Tính lại điểm trung bình và tổng số lượt đánh giá
  Object.keys(store).forEach((k) => {
    if (store[k].reviews.length > 0) {
      store[k].totalReviews = store[k].reviews.length
      const sum = store[k].reviews.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0)
      store[k].rating = Number((sum / store[k].reviews.length).toFixed(1))
      store[k].summary = `Tổng hợp từ ${store[k].reviews.length} nhận xét thực tế của sinh viên trên Everytime.`
    } else {
      store[k].rating = null
      store[k].totalReviews = 0
      store[k].summary = DEFAULT_PROF_SUMMARY
    }
  })

  saveProfData(store)
  return store
}

// Tự động nạp file public /professor_reviews_formatted.xlsx
export async function autoLoadPublicProfExcel() {
  try {
    const res = await fetch('/professor_reviews_formatted.xlsx')
    if (res.ok) {
      const buf = await res.arrayBuffer()
      parseProfWorkbook(buf)
    }
  } catch (e) {
    console.warn('Không thể tự động tải file professor_reviews_formatted.xlsx:', e)
  }
}

// Tra cứu đánh giá giảng viên theo tên
export function getProfReviewData(tenGV) {
  if (!tenGV || String(tenGV).trim() === '') return null
  const store = loadStoredProfData()
  const key = normName(tenGV)

  // 1. Khớp chính xác tên
  if (store[key]) return store[key]

  // 2. Khớp mờ tên (partial match)
  const keys = Object.keys(store)
  const matchedKey = keys.find((k) => k.includes(key) || key.includes(k))
  if (matchedKey) return store[matchedKey]

  // 3. Fallback cho GV chưa có review chi tiết trong file
  return {
    tenGV: String(tenGV).trim(),
    rating: null,
    totalReviews: 0,
    summary: DEFAULT_PROF_SUMMARY,
    reviews: [],
  }
}

export function getProfScore(tenGV, profData = loadStoredProfData()) {
  const record = getProfReviewData(tenGV)
  const score = Number(record?.rating)

  if (Number.isFinite(score) && score > 0) {
    return { score, found: true, summary: record.summary || DEFAULT_PROF_SUMMARY }
  }

  return { score: 3.5, found: false, summary: DEFAULT_PROF_SUMMARY }
}

// Lấy thông tin Badge phân màu theo điểm số
export function getProfBadgeInfo(rating) {
  const score = Number(rating)
  if (!Number.isFinite(score) || score <= 0) {
    return {
      scoreText: 'TÚI MÙ',
      className: 'prof-badge prof-badge-gray',
      color: '#4b5563',
      bg: '#f3f4f6',
      border: '#d1d5db',
    }
  }

  if (score >= 4.0) {
    return {
      scoreText: `⭐ ${score.toFixed(1)}`,
      className: 'prof-badge prof-badge-green',
      color: '#15803d',
      bg: '#dcfce7',
      border: '#86efac',
    }
  } else if (score >= 3.0) {
    return {
      scoreText: `⭐ ${score.toFixed(1)}`,
      className: 'prof-badge prof-badge-yellow',
      color: '#a16207',
      bg: '#fef9c3',
      border: '#fef08a',
    }
  } else {
    return {
      scoreText: `⭐ ${score.toFixed(1)}`,
      className: 'prof-badge prof-badge-red',
      color: '#b91c1c',
      bg: '#fee2e2',
      border: '#fca5a5',
    }
  }
}
