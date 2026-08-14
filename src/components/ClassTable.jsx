import React, { useMemo, useState } from 'react'
import { formatTiet } from '../lib/tiet.js'

const EMPTY = {}
const EMPTY_SET = new Set()

// Bảng danh sách lớp có checkbox + lọc theo từng cột.
// props:
//  - selectedIds: Set id đang chọn
//  - blockedIds: Set id bị khóa (trùng lịch hoặc không khớp LT–TH)
//  - blockedReason: Map id -> lý do khóa (hiển thị tooltip)
//  - suggestIds: Set id lớp TH tương ứng với LT đã chọn (gợi ý)
//  - onToggle(id)
export default function ClassTable({
  classes,
  selectedIds = EMPTY_SET,
  blockedIds = EMPTY_SET,
  blockedReason = EMPTY,
  suggestIds = EMPTY_SET,
  onToggle,
}) {
  const [f, setF] = useState({ mh: '', lop: '', gv: '', thu: '', tiet: '', phong: '', tc: '' })
  const [type, setType] = useState('all') // all | LT | TH
  const [hideBlocked, setHideBlocked] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const tcOptions = useMemo(() => {
    const s = new Set()
    for (const c of classes) if (c.soTC) s.add(c.soTC)
    return [...s].sort((a, b) => a - b)
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
      if (gv && !c.tenGV.toLowerCase().includes(gv)) return false
      if (f.thu) {
        if (f.thu === '*') { if (c.thu != null) return false }
        else if (String(c.thu) !== f.thu) return false
      }
      if (tiet) {
        const label = c.tiets.length ? formatTiet(c.tiets).toLowerCase() : '*'
        const raw = c.tiets.join('')
        if (!label.includes(tiet) && !raw.includes(tiet)) return false
      }
      if (phong && !(c.phong || '').toLowerCase().includes(phong)) return false
      if (f.tc && String(c.soTC) !== f.tc) return false
      return true
    })
  }, [classes, f, type, hideBlocked, blockedIds])

  const active =
    type !== 'all' || Object.values(f).some((v) => v !== '')

  function clearAll() {
    setF({ mh: '', lop: '', gv: '', thu: '', tiet: '', phong: '', tc: '' })
    setType('all')
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
              <th className="col-tc">TC</th>
            </tr>
            <tr className="ct-filter-row">
              <th className="ct-cb"></th>
              <th><input className="ct-fi" value={f.mh} onChange={set('mh')} placeholder="Tên / mã môn…" /></th>
              <th><input className="ct-fi" value={f.lop} onChange={set('lop')} placeholder="Mã lớp…" /></th>
              <th><input className="ct-fi" value={f.gv} onChange={set('gv')} placeholder="Giảng viên…" /></th>
              <th>
                <select className="ct-fi" value={f.thu} onChange={set('thu')}>
                  <option value="">Tất cả</option>
                  {[2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>Thứ {d}</option>)}
                  <option value="*">Không cố định</option>
                </select>
              </th>
              <th><input className="ct-fi" value={f.tiet} onChange={set('tiet')} placeholder="vd 1-3" /></th>
              <th><input className="ct-fi" value={f.phong} onChange={set('phong')} placeholder="Phòng…" /></th>
              <th>
                <select className="ct-fi" value={f.tc} onChange={set('tc')}>
                  <option value="">Tất cả</option>
                  {tcOptions.map((tc) => <option key={tc} value={tc}>{tc}</option>)}
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
              return (
                <tr
                  key={c.id}
                  className={cls}
                  title={blocked ? blockedReason.get(c.id) : ''}
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
                  <td className="col-gv">{c.tenGV || <span className="ct-muted">—</span>}</td>
                  <td className="col-thu ct-num">{c.thu ?? <span className="ct-muted">*</span>}</td>
                  <td className="col-tiet ct-num">{c.tiets.length ? formatTiet(c.tiets) : <span className="ct-muted">*</span>}</td>
                  <td className="col-phong ct-mono">{c.phong && c.phong !== '*' ? c.phong : <span className="ct-muted">—</span>}</td>
                  <td className="col-tc ct-num">{c.soTC || ''}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="ct-empty">Không có lớp nào khớp bộ lọc.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
