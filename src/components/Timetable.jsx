import React, { forwardRef } from 'react'
import { DAYS, TIET_LIST, TIET_TIME, formatTiet } from '../lib/tiet.js'

// Bảng màu dịu, gán ổn định theo mã môn học
const PALETTE = [
  '#dbeafe', '#dcfce7', '#fef9c3', '#fce7f3', '#e0e7ff',
  '#ffedd5', '#ccfbf1', '#f3e8ff', '#fee2e2', '#ecfccb',
  '#cffafe', '#fae8ff',
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

const Timetable = forwardRef(function Timetable({ classes, planName, onDeleteClass }, ref) {
  const scheduled = classes.filter((c) => c.thu != null && c.tiets.length > 0)
  const noFixed = classes.filter((c) => c.thu == null || c.tiets.length === 0)

  // Chuẩn bị các block để đặt vào lưới
  const blocks = []
  for (const c of scheduled) {
    for (const [a, b] of contiguousRanges(c.tiets)) {
      blocks.push({ c, dayKey: c.thu, startTiet: a, endTiet: b })
    }
  }

  return (
    <div className="tt-wrap" ref={ref}>
      <div className="tt-title">
        Thời khóa biểu — <strong>{planName}</strong>
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
        {blocks.map((b, i) => (
          <div
            key={i}
            className="tt-block"
            style={{
              gridColumn: dayCol(b.dayKey),
              gridRow: `${tietRow(b.startTiet)} / ${tietRow(b.endTiet) + 1}`,
              background: colorFor(b.c.maMH || b.c.maLop),
            }}
          >
            <button
              className="tt-block-delete"
              onClick={() => onDeleteClass?.(b.c.id)}
              title="Xóa lớp này"
            >
              ✕
            </button>
            <div className="tt-block-code" title={b.c.maLop}>{b.c.maLop}</div>
            <div className="tt-block-name" title={b.c.tenMH}>{b.c.tenMH}</div>
            {b.c.tenGV && <div className="tt-block-gv">{b.c.tenGV}</div>}
            <div className="tt-block-meta">
              {b.c.phong && b.c.phong !== '*' ? `Phòng ${b.c.phong}` : ''}
              {b.c.phong && b.c.phong !== '*' ? ' · ' : ''}Tiết {formatTiet(b.c.tiets)}
            </div>
          </div>
        ))}
      </div>

      {noFixed.length > 0 && (
        <div className="tt-nofixed">
          <div className="tt-nofixed-h">Lớp không có giờ cố định (ĐA/KLTN/TTTN…)</div>
          <div className="tt-nofixed-list">
            {noFixed.map((c) => (
              <span key={c.id} className="tt-chip" style={{ background: colorFor(c.maMH || c.maLop) }}>
                {c.maLop} — {c.tenMH}
              </span>
            ))}
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
