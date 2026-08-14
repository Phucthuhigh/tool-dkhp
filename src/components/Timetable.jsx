import React, { forwardRef } from 'react'
import { DAYS, TIET_LIST, TIET_TIME, formatTiet } from '../lib/tiet.js'

// Bảng màu rực rỡ & hài hòa, có accent line, gradient và chế độ sáng/tối
const PALETTE = [
  {
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: '#bfdbfe',
    accent: '#2563eb',
    text: '#1e3a8a',
    subtext: '#2563eb',
    tagBg: '#dbeafe',
    tagBorder: '#93c5fd',
    tagText: '#1d4ed8',
    darkBg: 'linear-gradient(135deg, rgba(30, 58, 138, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)',
    darkBorder: '#1e40af',
    darkAccent: '#3b82f6',
    darkText: '#eff6ff',
    darkSubtext: '#93c5fd',
  },
  {
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    border: '#a7f3d0',
    accent: '#059669',
    text: '#064e3b',
    subtext: '#059669',
    tagBg: '#d1fae5',
    tagBorder: '#6ee7b7',
    tagText: '#047857',
    darkBg: 'linear-gradient(135deg, rgba(6, 78, 59, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)',
    darkBorder: '#065f46',
    darkAccent: '#10b981',
    darkText: '#ecfdf5',
    darkSubtext: '#6ee7b7',
  },
  {
    bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    border: '#ddd6fe',
    accent: '#7c3aed',
    text: '#4c1d95',
    subtext: '#7c3aed',
    tagBg: '#ede9fe',
    tagBorder: '#c4b5fd',
    tagText: '#6d28d9',
    darkBg: 'linear-gradient(135deg, rgba(76, 29, 149, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)',
    darkBorder: '#5b21b6',
    darkAccent: '#8b5cf6',
    darkText: '#f5f3ff',
    darkSubtext: '#c4b5fd',
  },
  {
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    border: '#fde68a',
    accent: '#d97706',
    text: '#78350f',
    subtext: '#d97706',
    tagBg: '#fef3c7',
    tagBorder: '#fcd34d',
    tagText: '#b45309',
    darkBg: 'linear-gradient(135deg, rgba(120, 53, 15, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)',
    darkBorder: '#92400e',
    darkAccent: '#f59e0b',
    darkText: '#fffbeb',
    darkSubtext: '#fcd34d',
  },
  {
    bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
    border: '#fecdd3',
    accent: '#e11d48',
    text: '#881337',
    subtext: '#e11d48',
    tagBg: '#ffe4e6',
    tagBorder: '#fda4af',
    tagText: '#be123c',
    darkBg: 'linear-gradient(135deg, rgba(136, 19, 55, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)',
    darkBorder: '#9f1239',
    darkAccent: '#f43f5e',
    darkText: '#fff1f2',
    darkSubtext: '#fda4af',
  },
  {
    bg: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
    border: '#a5f3fc',
    accent: '#0891b2',
    text: '#164e63',
    subtext: '#0891b2',
    tagBg: '#cffafe',
    tagBorder: '#67e8f9',
    tagText: '#0e7490',
    darkBg: 'linear-gradient(135deg, rgba(22, 78, 99, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)',
    darkBorder: '#155e75',
    darkAccent: '#06b6d4',
    darkText: '#ecfeff',
    darkSubtext: '#67e8f9',
  },
  {
    bg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    border: '#c7d2fe',
    accent: '#4f46e5',
    text: '#312e81',
    subtext: '#4f46e5',
    tagBg: '#e0e7ff',
    tagBorder: '#a5b4fc',
    tagText: '#4338ca',
    darkBg: 'linear-gradient(135deg, rgba(49, 46, 129, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)',
    darkBorder: '#3730a3',
    darkAccent: '#6366f1',
    darkText: '#eef2ff',
    darkSubtext: '#a5b4fc',
  },
  {
    bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    border: '#fed7aa',
    accent: '#ea580c',
    text: '#7c2d12',
    subtext: '#ea580c',
    tagBg: '#ffedd5',
    tagBorder: '#fdba74',
    tagText: '#c2410c',
    darkBg: 'linear-gradient(135deg, rgba(124, 45, 18, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)',
    darkBorder: '#9a3412',
    darkAccent: '#f97316',
    darkText: '#fff7ed',
    darkSubtext: '#fdba74',
  },
  {
    bg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
    border: '#99f6e4',
    accent: '#0d9488',
    text: '#134e4a',
    subtext: '#0d9488',
    tagBg: '#ccfbf1',
    tagBorder: '#5eead4',
    tagText: '#0f766e',
    darkBg: 'linear-gradient(135deg, rgba(19, 78, 74, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)',
    darkBorder: '#115e59',
    darkAccent: '#14b8a6',
    darkText: '#f0fdfa',
    darkSubtext: '#5eead4',
  },
  {
    bg: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)',
    border: '#f5d0fe',
    accent: '#c026d3',
    text: '#701a75',
    subtext: '#c026d3',
    tagBg: '#fae8ff',
    tagBorder: '#f0abfc',
    tagText: '#a21caf',
    darkBg: 'linear-gradient(135deg, rgba(112, 26, 117, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)',
    darkBorder: '#86198f',
    darkAccent: '#d946ef',
    darkText: '#fdf4ff',
    darkSubtext: '#f0abfc',
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

const Timetable = forwardRef(function Timetable({ classes, planName, onDeselect }, ref) {
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
          return (
            <div
              key={i}
              className="tt-block"
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
          <div className="tt-nofixed-h">Lớp không có giờ cố định (ĐA/KLTN/TTTN…)</div>
          <div className="tt-nofixed-list">
            {noFixed.map((c) => {
              const theme = colorFor(c.maMH || c.maLop)
              return (
                <span
                  key={c.id}
                  className="tt-chip"
                  style={{
                    '--c-bg': theme.bg,
                    '--c-border': theme.border,
                    '--c-accent': theme.accent,
                    '--c-text': theme.text,
                    '--c-dark-bg': theme.darkBg,
                    '--c-dark-border': theme.darkBorder,
                    '--c-dark-accent': theme.darkAccent,
                    '--c-dark-text': theme.darkText,
                  }}
                >
                  <span className="tt-chip-code">{c.maLop}</span>{' '}
                  {c.htgd && <span className="tt-chip-tag">[{c.htgd}]</span>} — {c.tenMH}
                </span>
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

export default Timetable
