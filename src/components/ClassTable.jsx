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

// Cột khoaDKHP là danh sách khoá được phép ĐKHP, ngăn cách bằng dấu phẩy — vd "12, 13, 14".
// Tách thành mảng từng khoá riêng lẻ để so khớp "khoá X có nằm trong danh sách không"
// thay vì so bằng chuỗi nguyên văn.
function parseKhoaDKHP(raw) {
  if (!raw) return []
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean)
}

// Lớp có khớp khoá đang lọc không — ưu tiên danh sách khoaDKHP (nếu có), rơi về so trực
// tiếp với cột khoa (khoá chung, không phải danh sách) cho các lớp/file chưa có khoaDKHP.
function matchKhoaFilter(c, khoaValue) {
  if (!khoaValue) return true
  const list = parseKhoaDKHP(c.khoaDKHP)
  if (list.length) return list.includes(khoaValue)
  return c.khoa === khoaValue
}

// Nén danh sách khoá liên tục thành dạng khoảng cho gọn — "12, 13, 14, 15" -> "12-15" —
// vì hiển thị nguyên văn cả chuỗi rất dễ tràn ra đè lên cột kế bên trong bảng dày cột.
function formatKhoaList(raw) {
  const list = parseKhoaDKHP(raw)
  if (list.length === 0) return ''
  const nums = list.map(Number)
  if (nums.some((n) => Number.isNaN(n))) return list.join(', ')
  const sorted = [...nums].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) { prev = sorted[i]; continue }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = prev = sorted[i]
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
  return ranges.join(', ')
}

// Mỗi dòng bảng được memo hoá riêng: props chỉ gồm giá trị nguyên thuỷ (checked/blocked/
// suggest/blockedReasonText) + object lớp `c` vốn không đổi identity giữa các lần chọn/bỏ
// chọn lớp khác. Nhờ vậy khi bấm chọn 1 lớp, React chỉ render lại đúng những dòng có trạng
// thái thực sự đổi (thường chỉ vài dòng trùng lịch/cùng môn), bỏ qua hàng nghìn dòng còn lại
// — thay vì phải dựng lại + so khớp toàn bộ bảng mỗi lần click như trước.
const ClassRow = React.memo(function ClassRow({ c, checked, blocked, suggest, blockedReasonText }) {
  const cls = checked ? 'ct-selected' : blocked ? 'ct-blocked' : suggest ? 'ct-suggest' : ''
  const hkLabel = [c.hocKy, c.namHoc].filter(Boolean).join(' / ')
  const extraInfo = [
    c.heDT && `Hệ: ${c.heDT}`,
    c.khoaQL && `Khoa QL: ${c.khoaQL}`,
    c.ngonNgu && `Ngôn ngữ: ${c.ngonNgu}`,
    c.ghiChu && `Ghi chú: ${c.ghiChu}`,
  ].filter(Boolean).join(' | ')
  const tooltip = blocked ? blockedReasonText : (extraInfo || undefined)

  return (
    <tr data-id={c.id} data-blocked={blocked ? '1' : '0'} className={cls} title={tooltip}>
      <td className="ct-cb">
        <input type="checkbox" checked={checked} disabled={blocked} readOnly />
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
      <td className="col-khoa ct-mono" title={c.khoaDKHP || undefined}>
        {formatKhoaList(c.khoaDKHP) || c.khoa || <span className="ct-muted">—</span>}
      </td>
      <td className="col-hk ct-mono">{hkLabel || <span className="ct-muted">—</span>}</td>
    </tr>
  )
})

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

  // Bắt sự kiện click theo kiểu delegation (1 handler ở <tbody> thay vì mỗi dòng 1 callback)
  // — để các dòng có thể memo hoá độc lập mà không phụ thuộc identity của onToggle.
  function handleBodyClick(e) {
    const tr = e.target.closest('tr[data-id]')
    if (!tr || tr.dataset.blocked === '1') return
    onToggle(tr.dataset.id)
  }
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

  // Tập hợp khóa học duy nhất để làm dropdown — tách từ danh sách khoaDKHP (vd "12, 13, 14"),
  // rơi về cột khoa (giá trị đơn) cho lớp không có khoaDKHP.
  const khoaOptions = useMemo(() => {
    const s = new Set()
    for (const c of classes) {
      const list = parseKhoaDKHP(c.khoaDKHP)
      if (list.length) list.forEach((k) => s.add(k))
      else if (c.khoa) s.add(c.khoa)
    }
    return [...s].sort((a, b) => (Number(a) - Number(b)) || a.localeCompare(b))
  }, [classes])

  // Tách riêng phần lọc theo bộ lọc/loại (KHÔNG phụ thuộc blockedIds) khỏi phần lọc theo
  // hideBlocked — vì blockedIds đổi identity mỗi lần chọn/bỏ chọn 1 lớp bất kỳ. Nếu gộp
  // chung 1 mảng phụ thuộc như cũ, mỗi lần bấm chọn lớp sẽ buộc quét lại TOÀN BỘ danh sách
  // (có thể hàng nghìn dòng) dù người dùng không bật "Ẩn lớp không hợp lệ".
  const baseFiltered = useMemo(() => {
    const mh = f.mh.trim().toLowerCase()
    const lop = f.lop.trim().toLowerCase()
    const gv = f.gv.trim().toLowerCase()
    const phong = f.phong.trim().toLowerCase()
    return classes.filter((c) => {
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
      if (!matchKhoaFilter(c, f.khoa)) return false
      return true
    })
  }, [classes, f, type])

  const filtered = useMemo(() => {
    if (!hideBlocked) return baseFiltered
    return baseFiltered.filter((c) => !blockedIds.has(c.id))
  }, [baseFiltered, hideBlocked, blockedIds])

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
          <tbody onClick={handleBodyClick}>
            {filtered.map((c) => {
              const checked = selectedIds.has(c.id)
              const blocked = !checked && blockedIds.has(c.id)
              const suggest = !checked && !blocked && suggestIds.has(c.id)
              return (
                <ClassRow
                  key={c.id}
                  c={c}
                  checked={checked}
                  blocked={blocked}
                  suggest={suggest}
                  blockedReasonText={blocked ? blockedReason.get(c.id) : undefined}
                />
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
