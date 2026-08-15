import React, { forwardRef } from 'react'
import { DAYS, TIET_LIST, TIET_TIME, formatTiet } from '../lib/tiet.js'

// Bảng màu rực rỡ & hài hòa, có accent line, gradient và chế độ sáng/tối
const PALETTE = [
  // 1. Warm Peach / Cream Orange
  {
    bg: 'linear-gradient(135deg, #fff3e0 0%, #ffe8c5 100%)',
    border: '#fca556',
    accent: '#ea580c',
    text: '#1f2937',
    subtext: '#4b5563',
    tagBg: '#fed7aa',
    tagBorder: '#fb923c',
    tagText: '#c2410c',
    darkBg: 'linear-gradient(135deg, rgba(194, 65, 12, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#ea580c',
    darkAccent: '#f97316',
    darkText: '#fff7ed',
    darkSubtext: '#ffedd5',
  },
  // 2. Soft Periwinkle / Indigo Blue
  {
    bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
    border: '#818cf8',
    accent: '#3730a3',
    text: '#1e1b4b',
    subtext: '#374151',
    tagBg: '#a5b4fc',
    tagBorder: '#6366f1',
    tagText: '#312e81',
    darkBg: 'linear-gradient(135deg, rgba(67, 56, 202, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#6366f1',
    darkAccent: '#818cf8',
    darkText: '#eef2ff',
    darkSubtext: '#c7d2fe',
  },
  // 3. Soft Lavender / Purple
  {
    bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
    border: '#c084fc',
    accent: '#6d28d9',
    text: '#3b0764',
    subtext: '#4b5563',
    tagBg: '#d8b4fe',
    tagBorder: '#a855f7',
    tagText: '#5b21b6',
    darkBg: 'linear-gradient(135deg, rgba(126, 34, 206, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#a855f7',
    darkAccent: '#c084fc',
    darkText: '#f5f3ff',
    darkSubtext: '#e9d5ff',
  },
  // 4. Soft Blush Pink / Rose
  {
    bg: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
    border: '#f87171',
    accent: '#be123c',
    text: '#4c0519',
    subtext: '#4b5563',
    tagBg: '#fda4af',
    tagBorder: '#f43f5e',
    tagText: '#9f1239',
    darkBg: 'linear-gradient(135deg, rgba(190, 18, 60, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#f43f5e',
    darkAccent: '#fb7185',
    darkText: '#fff1f2',
    darkSubtext: '#fecdd3',
  },
  // 5. Soft Lime Green
  {
    bg: 'linear-gradient(135deg, #f7fee7 0%, #d9f99d 100%)',
    border: '#a3e635',
    accent: '#4d7c0f',
    text: '#1a2e05',
    subtext: '#374151',
    tagBg: '#bef264',
    tagBorder: '#84cc16',
    tagText: '#3f6212',
    darkBg: 'linear-gradient(135deg, rgba(77, 124, 15, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#84cc16',
    darkAccent: '#a3e635',
    darkText: '#ecfccb',
    darkSubtext: '#d9f99d',
  },
  // 6. Vibrant Sky Blue
  {
    bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
    border: '#38bdf8',
    accent: '#0369a1',
    text: '#0c4a6e',
    subtext: '#374151',
    tagBg: '#7dd3fc',
    tagBorder: '#0284c7',
    tagText: '#075985',
    darkBg: 'linear-gradient(135deg, rgba(3, 105, 161, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#0284c7',
    darkAccent: '#38bdf8',
    darkText: '#f0f9ff',
    darkSubtext: '#bae6fd',
  },
  // 7. Fresh Mint / Emerald
  {
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)',
    border: '#34d399',
    accent: '#047857',
    text: '#064e3b',
    subtext: '#374151',
    tagBg: '#6ee7b7',
    tagBorder: '#10b981',
    tagText: '#065f46',
    darkBg: 'linear-gradient(135deg, rgba(4, 120, 87, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#10b981',
    darkAccent: '#34d399',
    darkText: '#ecfdf5',
    darkSubtext: '#a7f3d0',
  },
  // 8. Bright Amber Yellow
  {
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)',
    border: '#fbbf24',
    accent: '#b45309',
    text: '#451a03',
    subtext: '#374151',
    tagBg: '#fcd34d',
    tagBorder: '#f59e0b',
    tagText: '#92400e',
    darkBg: 'linear-gradient(135deg, rgba(180, 83, 9, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#f59e0b',
    darkAccent: '#fbbf24',
    darkText: '#fffbeb',
    darkSubtext: '#fde68a',
  },
  // 9. Coral Crimson
  {
    bg: 'linear-gradient(135deg, #fef2f2 0%, #fca5a5 100%)',
    border: '#f87171',
    accent: '#b91c1c',
    text: '#450a0a',
    subtext: '#374151',
    tagBg: '#f87171',
    tagBorder: '#ef4444',
    tagText: '#991b1b',
    darkBg: 'linear-gradient(135deg, rgba(185, 28, 28, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#ef4444',
    darkAccent: '#f87171',
    darkText: '#fef2f2',
    darkSubtext: '#fca5a5',
  },
  // 10. Fuchsia Magenta
  {
    bg: 'linear-gradient(135deg, #fdf4ff 0%, #f5d0fe 100%)',
    border: '#e879f9',
    accent: '#a21caf',
    text: '#4a044e',
    subtext: '#374151',
    tagBg: '#f0abfc',
    tagBorder: '#d946ef',
    tagText: '#86198f',
    darkBg: 'linear-gradient(135deg, rgba(162, 28, 175, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#d946ef',
    darkAccent: '#e879f9',
    darkText: '#fdf4ff',
    darkSubtext: '#f5d0fe',
  },
  // 11. Bright Hot Pink
  {
    bg: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)',
    border: '#f472b6',
    accent: '#be185d',
    text: '#500724',
    subtext: '#374151',
    tagBg: '#f9a8d4',
    tagBorder: '#ec4899',
    tagText: '#9d174d',
    darkBg: 'linear-gradient(135deg, rgba(190, 24, 93, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#ec4899',
    darkAccent: '#f472b6',
    darkText: '#fdf2f8',
    darkSubtext: '#fbcfe8',
  },
  // 12. Fresh Teal Turquoise
  {
    bg: 'linear-gradient(135deg, #f0fdfa 0%, #99f6e4 100%)',
    border: '#2dd4bf',
    accent: '#0f766e',
    text: '#042f2e',
    subtext: '#374151',
    tagBg: '#5eead4',
    tagBorder: '#14b8a6',
    tagText: '#115e59',
    darkBg: 'linear-gradient(135deg, rgba(15, 118, 110, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#14b8a6',
    darkAccent: '#2dd4bf',
    darkText: '#f0fdfa',
    darkSubtext: '#99f6e4',
  },
  // 13. Vivid Orange
  {
    bg: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    border: '#fb923c',
    accent: '#c2410c',
    text: '#431407',
    subtext: '#374151',
    tagBg: '#fdba74',
    tagBorder: '#f97316',
    tagText: '#9a3412',
    darkBg: 'linear-gradient(135deg, rgba(194, 65, 12, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#f97316',
    darkAccent: '#fb923c',
    darkText: '#fff7ed',
    darkSubtext: '#fed7aa',
  },
  // 14. Chartreuse Lemon
  {
    bg: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)',
    border: '#facc15',
    accent: '#a16207',
    text: '#422006',
    subtext: '#374151',
    tagBg: '#fde047',
    tagBorder: '#eab308',
    tagText: '#854d0e',
    darkBg: 'linear-gradient(135deg, rgba(161, 98, 7, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#eab308',
    darkAccent: '#facc15',
    darkText: '#fefce8',
    darkSubtext: '#fef08a',
  },
  // 15. Deep Royal Blue
  {
    bg: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)',
    border: '#60a5fa',
    accent: '#1d4ed8',
    text: '#1e3a8a',
    subtext: '#374151',
    tagBg: '#93c5fd',
    tagBorder: '#3b82f6',
    tagText: '#1e40af',
    darkBg: 'linear-gradient(135deg, rgba(29, 78, 216, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#3b82f6',
    darkAccent: '#60a5fa',
    darkText: '#eff6ff',
    darkSubtext: '#bfdbfe',
  },
  // 16. Soft Slate Mauve
  {
    bg: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)',
    border: '#94a3b8',
    accent: '#334155',
    text: '#0f172a',
    subtext: '#374151',
    tagBg: '#94a3b8',
    tagBorder: '#64748b',
    tagText: '#1e293b',
    darkBg: 'linear-gradient(135deg, rgba(51, 65, 85, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
    darkBorder: '#64748b',
    darkAccent: '#94a3b8',
    darkText: '#f8fafc',
    darkSubtext: '#cbd5e1',
  },
]

function colorFor(key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

// Gom các tiết liên tiếp thành các đoạn [start,end]
function contiguousRanges(tiets) {
  const s = [...tiets].sort((a, b) => a - b)
  const ranges = []
  let start = s[0]
  let prev = s[0]
  for (let i = 1; i < s.length; i++) {
    if (s[i] === prev + 1) prev = s[i]
    else {
      ranges.push([start, prev])
      start = prev = s[i]
    }
  }
  if (start !== undefined) ranges.push([start, prev])
  return ranges
}

const Timetable = forwardRef(function Timetable({ classes, planName, onDeselect, onSelectCourse }, ref) {
  const scheduled = classes.filter((c) => c.thu != null && c.tiets.length > 0)
  const noFixed = classes.filter((c) => c.thu == null || c.tiets.length === 0)
  const totalTC = classes.reduce((s, c) => s + (Number(c.soTC) || 0), 0)

  // Chuẩn bị các block để đặt vào lưới
  const blocks = []
  for (const c of scheduled) {
    for (const [a, b] of contiguousRanges(c.tiets)) {
      blocks.push({ c, dayKey: c.thu, startTiet: a, endTiet: b })
    }
  }

  return (
    <div className="tt-wrap" ref={ref}>
      <div className="tt-header">
        <div className="tt-title">
          Thời khóa biểu — <strong>{planName}</strong>
        </div>
        <div className="tt-stats">
          <span className="tt-stat-badge">
            <strong>{classes.length}</strong> lớp
          </span>
          <span className="tt-stat-badge">
            <strong>{totalTC}</strong> tín chỉ
          </span>
        </div>
      </div>
      <div className="tt-grid">
        {/* Góc trên trái */}
        <div className="tt-corner">Tiết \ Thứ</div>
        {/* Header các thứ */}
        {DAYS.map((d) => (
          <div key={d.key} className="tt-day-head" style={{ gridColumn: dayCol(d.key) }}>
            {d.label}
          </div>
        ))}

        {/* Cột giờ + các ô nền */}
        {TIET_LIST.map((t) => (
          <React.Fragment key={t}>
            <div className="tt-time" style={{ gridRow: tietRow(t) }}>
              <div className="tt-time-n">Tiết {t}</div>
              <div className="tt-time-h">
                {TIET_TIME[t][0]}–{TIET_TIME[t][1]}
              </div>
            </div>
            {DAYS.map((d) => (
              <div
                key={d.key + '-' + t}
                className="tt-cell"
                style={{ gridColumn: dayCol(d.key), gridRow: tietRow(t) }}
              />
            ))}
          </React.Fragment>
        ))}

        {/* Các block lớp học */}
        {blocks.map((b, i) => {
          const theme = colorFor(b.c.maMH || b.c.maLop)
          const courseCode = b.c.maMH || b.c.maLop
          const dateRange = getDateRange(b.c.nhd, b.c.nk1)
          const dateTooltip = getDateTooltip(b.c.nhd, b.c.nk1)
          return (
            <div
              key={i}
              className="tt-block"
              onClick={() => onSelectCourse?.(courseCode)}
              title={`${b.c.tenMH} (${b.c.maLop})${dateTooltip ? ` | ${dateTooltip}` : ''} — Click để lọc môn học này`}
              style={{
                gridColumn: dayCol(b.dayKey),
                gridRow: `${tietRow(b.startTiet)} / ${tietRow(b.endTiet) + 1}`,
                '--c-bg': theme.bg,
                '--c-border': theme.border,
                '--c-accent': theme.accent,
                '--c-text': theme.text,
                '--c-sub': theme.subtext,
                '--c-tag-bg': theme.tagBg,
                '--c-tag-border': theme.tagBorder,
                '--c-tag-text': theme.tagText,
                '--c-dark-bg': theme.darkBg,
                '--c-dark-border': theme.darkBorder,
                '--c-dark-accent': theme.darkAccent,
                '--c-dark-text': theme.darkText,
                '--c-dark-sub': theme.darkSubtext,
              }}
            >
              <button
                className="tt-block-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeselect?.(b.c.id)
                }}
                title="Bỏ chọn lớp này"
              >
                ✕
              </button>
              <div className="tt-block-code" title={b.c.maLop}>
                <span className="tt-code-text">{b.c.maLop}</span>
                {b.c.htgd && (
                  <span className={`tt-tag tt-tag-${b.c.htgd === 'LT' ? 'lt' : 'th'}`}>
                    {b.c.htgd}
                  </span>
                )}
              </div>
              <div className="tt-block-name" title={b.c.tenMH}>
                {b.c.tenMH}
              </div>
              {b.c.tenGV && (
                <div className="tt-block-gv" title={b.c.tenGV}>
                  <span className="tt-gv-icon">👤</span> {b.c.tenGV}
                </div>
              )}
              {dateRange && (
                <div className="tt-block-date" title={dateTooltip || undefined}>
                  <span className="tt-gv-icon">📅</span> {dateRange}
                </div>
              )}
              <div className="tt-block-meta">
                {b.c.phong && b.c.phong !== '*' && (
                  <span className="tt-meta-room">
                    <span className="tt-meta-icon">📍</span> {b.c.phong}
                  </span>
                )}
                {b.c.phong && b.c.phong !== '*' && <span className="tt-meta-dot">•</span>}
                <span className="tt-meta-time">
                  <span className="tt-meta-icon">⏱</span> Tiết {formatTiet(b.c.tiets)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {noFixed.length > 0 && (
        <div className="tt-nofixed">
          <div className="tt-nofixed-h">Lớp không có giờ cố định (ĐA / KLTN / TTTN…)</div>
          <div className="tt-nofixed-list">
            {noFixed.map((c) => {
              const theme = colorFor(c.maMH || c.maLop)
              const courseCode = c.maMH || c.maLop
              const dateRange = getDateRange(c.nhd, c.nk1)
              const dateTooltip = getDateTooltip(c.nhd, c.nk1)
              return (
                <div
                  key={c.id}
                  className="tt-chip"
                  onClick={() => onSelectCourse?.(courseCode)}
                  title={`${c.tenMH} (${c.maLop})${dateTooltip ? ` | ${dateTooltip}` : ''} — Click để lọc môn học này`}
                  style={{
                    '--c-bg': theme.bg,
                    '--c-border': theme.border,
                    '--c-accent': theme.accent,
                    '--c-text': theme.text,
                    '--c-sub': theme.subtext,
                    '--c-tag-bg': theme.tagBg,
                    '--c-tag-border': theme.tagBorder,
                    '--c-tag-text': theme.tagText,
                    '--c-dark-bg': theme.darkBg,
                    '--c-dark-border': theme.darkBorder,
                    '--c-dark-accent': theme.darkAccent,
                    '--c-dark-text': theme.darkText,
                    '--c-dark-sub': theme.darkSubtext,
                  }}
                >
                  <button
                    className="tt-block-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeselect?.(c.id)
                    }}
                    title="Bỏ chọn lớp này"
                  >
                    ✕
                  </button>
                  <div className="tt-block-code" title={c.maLop}>
                    <span className="tt-code-text">{c.maLop}</span>
                    {c.htgd && (
                      <span className={`tt-tag tt-tag-${c.htgd === 'LT' ? 'lt' : 'th'}`}>
                        {c.htgd}
                      </span>
                    )}
                  </div>
                  <div className="tt-block-name" title={c.tenMH}>
                    {c.tenMH}
                  </div>
                  {c.tenGV && (
                    <div className="tt-block-gv" title={c.tenGV}>
                      <span className="tt-gv-icon">👤</span> {c.tenGV}
                    </div>
                  )}
                  {dateRange && (
                    <div className="tt-block-date" title={dateTooltip || undefined}>
                      <span className="tt-gv-icon">📅</span> {dateRange}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})

function dayCol(thu) {
  // cột 1 = giờ; thứ 2 -> cột 2, ... thứ 7 -> cột 7
  return thu // vì thu 2..7 khớp cột 2..7
}
function tietRow(t) {
  // hàng 1 = header; tiết 1 -> hàng 2, ...
  return t + 1
}

function formatDateStr(val) {
  if (!val) return ''
  const s = String(val).trim()
  if (!s) return ''
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Math.round((Number(s) - 25567) * 86400 * 1000))
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      return `${day}/${month}`
    }
  }
  const mIso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (mIso) {
    return `${mIso[3].padStart(2, '0')}/${mIso[2].padStart(2, '0')}`
  }
  const mDm = s.match(/^(\d{1,2})[/.-](\d{1,2})/)
  if (mDm) {
    return `${mDm[1].padStart(2, '0')}/${mDm[2].padStart(2, '0')}`
  }
  return s
}

function formatDateFull(val) {
  if (!val) return ''
  const s = String(val).trim()
  if (!s) return ''
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Math.round((Number(s) - 25567) * 86400 * 1000))
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${day}/${month}/${year}`
    }
  }
  const mIso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (mIso) {
    return `${mIso[3].padStart(2, '0')}/${mIso[2].padStart(2, '0')}/${mIso[1]}`
  }
  const mDmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
  if (mDmy) {
    return `${mDmy[1].padStart(2, '0')}/${mDmy[2].padStart(2, '0')}/${mDmy[3]}`
  }
  const mDm = s.match(/^(\d{1,2})[/.-](\d{1,2})$/)
  if (mDm) {
    return `${mDm[1].padStart(2, '0')}/${mDm[2].padStart(2, '0')}`
  }
  return s
}

function getDateRange(nhd, nk1) {
  const start = formatDateStr(nhd)
  const end = formatDateStr(nk1)
  if (start && end) return `${start} – ${end}`
  return start || end || ''
}

function getDateTooltip(nhd, nk1) {
  const start = formatDateFull(nhd)
  const end = formatDateFull(nk1)
  if (start && end) return `Ngày học: ${start} - ${end}`
  if (start) return `Ngày bắt đầu: ${start}`
  if (end) return `Ngày kết thúc: ${end}`
  return ''
}

export default Timetable
