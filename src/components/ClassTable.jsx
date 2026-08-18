import React, { useEffect, useMemo, useState } from 'react'
import { formatTiet } from '../lib/tiet.js'
import { buildIndex, isLT, isTH, parentLTCode } from '../lib/link.js'
import { getProfReviewData, getProfBadgeInfo } from '../lib/profReview.js'

const EMPTY = {}
const EMPTY_SET = new Set()

function matchTietFilter(c, tietStr) {
  if (!tietStr) return true
  const s = tietStr.trim().toLowerCase()
  if (!s) return true

  const rangeMatch = s.match(/^(\d+)\s*-\s*(\d+)$/)
  if (rangeMatch) {
    if (!c.tiets || c.tiets.length === 0) return false
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    const minRange = Math.min(start, end)
    const maxRange = Math.max(start, end)
    const minTiet = Math.min(...c.tiets)
    const maxTiet = Math.max(...c.tiets)
    return minTiet >= minRange && maxTiet <= maxRange
  }

  if (/^\d+$/.test(s)) {
    const target = parseInt(s, 10)
    return c.tiets && c.tiets.includes(target)
  }

  const label = c.tiets && c.tiets.length ? formatTiet(c.tiets).toLowerCase() : '*'
  const raw = c.tiets ? c.tiets.join('') : ''
  return label.includes(s) || raw.includes(s)
}

function parseKhoaDKHP(raw) {
  if (!raw) return []
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean)
}

function matchKhoaFilter(c, khoaValue) {
  if (!khoaValue) return true
  const list = parseKhoaDKHP(c.khoaDKHP)
  if (list.length) return list.includes(khoaValue)
  return c.khoa === khoaValue
}

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

const ClassRow = React.memo(function ClassRow({ c, checked, blocked, suggest, blockedReasonText, nested, onProfClick }) {
  const cls = [checked ? 'ct-selected' : blocked ? 'ct-blocked' : suggest ? 'ct-suggest' : '', nested ? 'ct-nested' : ''].filter(Boolean).join(' ')
  const hkLabel = [c.hocKy, c.namHoc].filter(Boolean).join(' / ')
  const extraInfo = [
    c.heDT && `Hệ: ${c.heDT}`,
    c.khoaQL && `Khoa QL: ${c.khoaQL}`,
    c.ngonNgu && `Ngôn ngữ: ${c.ngonNgu}`,
    c.ghiChu && `Ghi chú: ${c.ghiChu}`,
  ].filter(Boolean).join(' | ')
  const tooltip = blocked ? blockedReasonText : (extraInfo || undefined)

  const profInfo = c.tenGV ? getProfReviewData(c.tenGV) : null
  const badge = profInfo ? getProfBadgeInfo(profInfo.rating) : null

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
        {c.tenGV ? (
          <button
            type="button"
            className="ct-prof-link"
            onClick={(e) => {
              e.stopPropagation()
              onProfClick?.(c.tenGV)
            }}
            title={`Xem review chi tiết của GV ${c.tenGV}`}
          >
            <span className="ct-prof-name">{c.tenGV}</span>
            {badge && (
              <span className={badge.className}>
                {badge.scoreText}
              </span>
            )}
          </button>
        ) : (
          <span className="ct-muted">—</span>
        )}
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
  onSelectMultiple,
  filterMH = '',
  onFilterMHChange,
  onProfClick,
}) {
  const [f, setF] = useState({ mh: filterMH, lop: '', gv: '', thu: '', tiet: '', phong: '', tc: '', hk: '', khoa: '' })

  function handleBodyClick(e) {
    if (e.target.closest('.ct-prof-link')) return
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

  const hkOptions = useMemo(() => {
    const s = new Set()
    for (const c of classes) {
      const label = [c.hocKy, c.namHoc].filter(Boolean).join(' / ')
      if (label) s.add(label)
    }
    return [...s].sort()
  }, [classes])

  const khoaOptions = useMemo(() => {
    const s = new Set()
    for (const c of classes) {
      const list = parseKhoaDKHP(c.khoaDKHP)
      if (list.length) list.forEach((k) => s.add(k))
      else if (c.khoa) s.add(c.khoa)
    }
    return [...s].sort((a, b) => (Number(a) - Number(b)) || a.localeCompare(b))
  }, [classes])

  // Lọc đa năng theo nhiều mã môn (ngăn cách bởi dấu phẩy, chấm phẩy, khoảng trắng, xuống dòng)
  const baseFiltered = useMemo(() => {
    const mhTerms = f.mh
      .split(/[\s,;\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    const lop = f.lop.trim().toLowerCase()
    const gv = f.gv.trim().toLowerCase()
    const phong = f.phong.trim().toLowerCase()

    return classes.filter((c) => {
      if (type === 'LT' && c.htgd !== 'LT') return false
      if (type === 'TH' && !(c.htgd === 'HT1' || c.htgd === 'HT2')) return false

      if (mhTerms.length > 0) {
        const fullStr = `${c.maMH} ${c.tenMH}`.toLowerCase()
        const matchesAny = mhTerms.some((term) => fullStr.includes(term))
        if (!matchesAny) return false
      }

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

  const byCode = useMemo(() => buildIndex(classes), [classes])

  const rows = useMemo(() => {
    const childrenByParent = new Map()
    for (const c of filtered) {
      if (!isTH(c)) continue
      const p = parentLTCode(c, byCode)
      if (!p) continue
      const arr = childrenByParent.get(p)
      if (arr) arr.push(c)
      else childrenByParent.set(p, [c])
    }

    const consumed = new Set()
    const out = []
    for (const c of filtered) {
      if (consumed.has(c.id)) continue
      out.push({ c, nested: false })
      consumed.add(c.id)
      if (!isLT(c)) continue
      const kids = childrenByParent.get(c.maLop)
      if (!kids) continue
      for (const k of kids) {
        if (consumed.has(k.id)) continue
        out.push({ c: k, nested: true })
        consumed.add(k.id)
      }
    }
    return out
  }, [filtered, byCode])

  const active = type !== 'all' || Object.values(f).some((v) => v !== '')

  function clearAll() {
    setF({ mh: '', lop: '', gv: '', thu: '', tiet: '', phong: '', tc: '', hk: '', khoa: '' })
    setType('all')
    onFilterMHChange?.('')
  }

  // Chọn hàng loạt tất cả môn đang lọc
  function handleSelectAllFiltered() {
    const selectable = filtered.filter((c) => !blockedIds.has(c.id))
    if (selectable.length === 0) return
    const ids = selectable.map((c) => c.id)
    onSelectMultiple?.(ids)
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

        <button
          className="ct-btn-select-all"
          onClick={handleSelectAllFiltered}
          title="Chọn tất cả các lớp hợp lệ đang hiển thị"
        >
          ✓ Chọn tất cả {filtered.length} lớp đang lọc
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
              <th>
                <input
                  id="input-filter-mh"
                  className="ct-fi"
                  value={f.mh}
                  onChange={set('mh')}
                  placeholder="Mã/tên môn (phẩy, cách...)"
                />
              </th>
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
            {rows.map(({ c, nested }) => {
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
                  nested={nested}
                  blockedReasonText={blocked ? blockedReason.get(c.id) : undefined}
                  onProfClick={onProfClick}
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
