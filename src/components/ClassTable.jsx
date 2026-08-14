import React, { useEffect, useMemo, useState } from 'react'
import { formatTiet } from '../lib/tiet.js'

const EMPTY = {}
const EMPTY_SET = new Set()

// Bảng danh sách lớp có checkbox + lọc theo từng cột.
// props:
//  - selectedIds: Set id đang chọn
//  - blockedIds: Set id bị khóa (trùng lịch hoặc không khớp LT–TH)
//  - blockedReason: Map id -> lý do khóa (hiển thị tooltip)
// Logic lọc tiết thông minh: hỗ trợ tìm khoảng "1-5", số đơn "3", hoặc chuỗi "1-3"
function matchTietFilter(c, tietStr) {
  if (!tietStr) return true
  const s = tietStr.trim().toLowerCase()
  if (!s) return true

  // Cú pháp khoảng: vd "1-5", "1 - 5", "6-10"
  const rangeMatch = s.match(/^(\d+)\s*-\s*(\d+)$/)
  if (rangeMatch) {
    if (!c.tiets || c.tiets.length === 0) return false
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    const minRange = Math.min(start, end)
    const maxRange = Math.max(start, end)
    const minTiet = Math.min(...c.tiets)
    const maxTiet = Math.max(...c.tiets)
    // Lớp nằm hoàn toàn trong khoảng [minRange, maxRange] (vd: 1-3, 4-5, 2-4 đều thuộc 1-5)
    return minTiet >= minRange && maxTiet <= maxRange
  }

  // Số đơn lẻ: vd "3" -> lớp chứa tiết 3
  if (/^\d+$/.test(s)) {
    const target = parseInt(s, 10)
    return c.tiets && c.tiets.includes(target)
  }

  // Khớp chuỗi thông thường
  const label = c.tiets && c.tiets.length ? formatTiet(c.tiets).toLowerCase() : '*'
  const raw = c.tiets ? c.tiets.join('') : ''
  return label.includes(s) || raw.includes(s)
}

export default function ClassTable({
  classes,
  selectedIds = EMPTY_SET,
  blockedIds = EMPTY_SET,
  blockedReason = EMPTY,
  suggestIds = EMPTY_SET,
  onToggle,
  filterMH = '',
  onFilterMHChange,
}) {
  const [f, setF] = useState({ mh: filterMH, lop: '', gv: '', thu: '', tiet: '', phong: '', tc: '', hk: '', khoa: '' })
  const [type, setType] = useState('all') // all | LT | TH
  const [hideBlocked, setHideBlocked] = useState(false)

  useEffect(() => {
    if (filterMH !== undefined && filterMH !== null) {
      setF((s) => ({ ...s, mh: filterMH }))
    }
  }, [filterMH])

  const set = (k) => (e) => {
    const val = e.target.value
    setF((s) => ({ ...s, [k]: val }))
    if (k === 'mh') onFilterMHChange?.(val)
  }

  const tcOptions = useMemo(() => {
    const s = new Set()
    for (const c of classes) if (c.soTC) s.add(c.soTC)
    return [...s].sort((a, b) => a - b)
  }, [classes])

  // Tập hợp học kỳ/năm học duy nhất để làm dropdown
  const hkOptions = useMemo(() => {
    const s = new Set()
    for (const c of classes) {
      const label = [c.hocKy, c.namHoc].filter(Boolean).join(' / ')
      if (label) s.add(label)
    }
    return [...s].sort()
  }, [classes])

  // Tập hợp khóa học duy nhất để làm dropdown
  const khoaOptions = useMemo(() => {
    const s = new Set()
    for (const c of classes) if (c.khoa) s.add(c.khoa)
    return [...s].sort()
  }, [classes])

  const filtered = useMemo(() => {
    const mh = f.mh.trim().toLowerCase()
    const lop = f.lop.trim().toLowerCase()
    const gv = f.gv.trim().toLowerCase()
    const tiet = f.tiet.trim().toLowerCase()
    const phong = f.phong.trim().toLowerCase()
    return classes.filter((c) => {
      if (hideBlocked && blockedIds.has(c.id)) return false
      if (type === 'LT' && c.htgd !== 'LT') return false
      if (type === 'TH' && !(c.htgd === 'HT1' || c.htgd === 'HT2')) return false
      if (mh && !(`${c.maMH} ${c.tenMH}`.toLowerCase().includes(mh))) return false
      if (lop && !c.maLop.toLowerCase().includes(lop)) return false
      if (gv && !(`${c.maGV || ''} ${c.tenGV}`.toLowerCase().includes(gv))) return false
      if (f.thu) {
        if (f.thu === '*') { if (c.thu != null) return false }
        else if (String(c.thu) !== f.thu) return false
      }
      if (f.tiet && !matchTietFilter(c, f.tiet)) return false
      if (phong && !(c.phong || '').toLowerCase().includes(phong)) return false
      if (f.tc && String(c.soTC) !== f.tc) return false
      if (f.hk) {
        const label = [c.hocKy, c.namHoc].filter(Boolean).join(' / ')
        if (label !== f.hk) return false
      }
      if (f.khoa && c.khoa !== f.khoa) return false
      return true
    })
  }, [classes, f, type, hideBlocked, blockedIds])

  const active =
    type !== 'all' || Object.values(f).some((v) => v !== '')

  function clearAll() {
    setF({ mh: '', lop: '', gv: '', thu: '', tiet: '', phong: '', tc: '', hk: '', khoa: '' })
    setType('all')
    onFilterMHChange?.('')
  }

  return (
    <div className="ct-wrap">
      <div className="ct-toolbar">
        <span className="ct-count">{filtered.length} / {classes.length} lớp</span>
        <div className="seg">
          {['all', 'LT', 'TH'].map((t) => (
            <button
              key={t}
              className={`seg-btn ${type === t ? 'active' : ''}`}
              onClick={() => setType(t)}
            >
              {t === 'all' ? 'Tất cả' : t}
            </button>
          ))}
        </div>
        <button
          className={`ct-toggle ${hideBlocked ? 'active' : ''}`}
          onClick={() => setHideBlocked((v) => !v)}
          title="Ẩn các lớp trùng lịch hoặc không khớp LT–TH"
        >
          {hideBlocked ? '🚫 Đang ẩn lớp không hợp lệ' : '👁 Ẩn lớp không hợp lệ'}
          {blockedIds.size > 0 && <span className="ct-toggle-badge">{blockedIds.size}</span>}
        </button>
        {active && (
          <button className="ct-clear" onClick={clearAll}>✕ Xóa lọc</button>
        )}
      </div>

      <div className="ct-scroll">
        <table className="ct-table">
          <thead>
            <tr className="ct-head-row">
              <th className="ct-cb"></th>
              <th className="col-mh">Môn học</th>
              <th className="col-lop">Mã lớp</th>
              <th className="col-gv">Giảng viên</th>
              <th className="col-thu">Thứ</th>
              <th className="col-tiet">Tiết</th>
              <th className="col-phong">Phòng</th>
              <th className="col-tc">Tín chỉ</th>
              <th className="col-khoa">Khóa học</th>
              <th className="col-hk">HK / Năm</th>
            </tr>
            <tr className="ct-filter-row">
              <th className="ct-cb"></th>
              <th><input id="input-filter-mh" className="ct-fi" value={f.mh} onChange={set('mh')} placeholder="Tên / mã môn…" /></th>
              <th><input className="ct-fi" value={f.lop} onChange={set('lop')} placeholder="Mã lớp…" /></th>
              <th><input className="ct-fi" value={f.gv} onChange={set('gv')} placeholder="GV / mã GV…" /></th>
              <th>
                <select className="ct-fi" value={f.thu} onChange={set('thu')}>
                  <option value="">Tất cả</option>
                  {[2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>Thứ {d}</option>)}
                  <option value="*">Không cố định</option>
                </select>
              </th>
              <th><input className="ct-fi" value={f.tiet} onChange={set('tiet')} placeholder="vd 1-5 hoặc 3" /></th>
              <th><input className="ct-fi" value={f.phong} onChange={set('phong')} placeholder="Phòng…" /></th>
              <th>
                <select className="ct-fi" value={f.tc} onChange={set('tc')}>
                  <option value="">Tất cả</option>
                  {tcOptions.map((tc) => <option key={tc} value={tc}>{tc}</option>)}
                </select>
              </th>
              <th>
                <select className="ct-fi" value={f.khoa} onChange={set('khoa')}>
                  <option value="">Tất cả</option>
                  {khoaOptions.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </th>
              <th>
                <select className="ct-fi" value={f.hk} onChange={set('hk')}>
                  <option value="">Tất cả</option>
                  {hkOptions.map((hk) => <option key={hk} value={hk}>{hk}</option>)}
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const checked = selectedIds.has(c.id)
              const blocked = !checked && blockedIds.has(c.id)
              const suggest = !checked && !blocked && suggestIds.has(c.id)
              const cls = checked ? 'ct-selected' : blocked ? 'ct-blocked' : suggest ? 'ct-suggest' : ''
              const hkLabel = [c.hocKy, c.namHoc].filter(Boolean).join(' / ')
              // Tooltip bổ sung thông tin từ các cột mới
              const extraInfo = [
                c.heDT && `Hệ: ${c.heDT}`,
                c.khoaQL && `Khoa QL: ${c.khoaQL}`,
                c.ngonNgu && `Ngôn ngữ: ${c.ngonNgu}`,
                c.ghiChu && `Ghi chú: ${c.ghiChu}`,
              ].filter(Boolean).join(' | ')
              const tooltip = blocked
                ? blockedReason.get(c.id)
                : extraInfo || undefined
              return (
                <tr
                  key={c.id}
                  className={cls}
                  title={tooltip}
                  onClick={() => { if (!blocked) onToggle(c.id) }}
                >
                  <td className="ct-cb">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={blocked}
                      onChange={() => onToggle(c.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="col-mh">
                    <div className="ct-mh">
                      {c.tenMH}
                      {suggest && <span className="ct-tag-th">TH tương ứng</span>}
                    </div>
                    <div className="ct-mamh">
                      {c.maMH}
                      {c.htgd && <span className={`ct-htgd ct-htgd-${c.htgd === 'LT' ? 'lt' : 'th'}`}>{c.htgd}</span>}
                    </div>
                  </td>
                  <td className="col-lop ct-mono">{c.maLop}</td>
                  <td className="col-gv">
                    {c.tenGV || <span className="ct-muted">—</span>}
                    {c.maGV && <div className="ct-mamh">{c.maGV}</div>}
                  </td>
                  <td className="col-thu ct-num">{c.thu ?? <span className="ct-muted">*</span>}</td>
                  <td className="col-tiet ct-num">{c.tiets.length ? formatTiet(c.tiets) : <span className="ct-muted">*</span>}</td>
                  <td className="col-phong ct-mono">{c.phong && c.phong !== '*' ? c.phong : <span className="ct-muted">—</span>}</td>
                  <td className="col-tc ct-num">{c.soTC || ''}</td>
                  <td className="col-khoa ct-mono">{c.khoa || <span className="ct-muted">—</span>}</td>
                  <td className="col-hk ct-mono">{hkLabel || <span className="ct-muted">—</span>}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="ct-empty">Không có lớp nào khớp bộ lọc.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
