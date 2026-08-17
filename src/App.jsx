import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import { parseWorkbook } from './lib/parseExcel.js'
import { isConflict } from './lib/tiet.js'
import { buildIndex, familyIncompatible, incompatReason, parentLTCode, isLT, isTH } from './lib/link.js'
import * as store from './lib/storage.js'
import FileUpload from './components/FileUpload.jsx'
import ClassTable from './components/ClassTable.jsx'
import Timetable from './components/Timetable.jsx'
import GuideModal from './components/GuideModal.jsx'
import CodesModal from './components/CodesModal.jsx'

const GUIDE_SEEN_KEY = 'dkhp.guideSeen.v1'
const SPLIT_KEY = 'dkhp.split.v1'
const SPLIT_DEFAULT_RATIO = 44.4 // % — khớp tỉ lệ minmax(1fr, 1.25fr) cũ
const SPLIT_RESIZER_W = 14 // px — phải khớp cột giữa trong CSS
const SPLIT_COLLAPSE_ENTER = 8 // % — vượt ngưỡng này khi kéo thì thu gọn pane
const SPLIT_COLLAPSE_EXIT = 14 // % — phải kéo lùi qua mốc này mới mở lại (chống nhấp nháy)

function loadSplit() {
  try {
    const raw = localStorage.getItem(SPLIT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.ratio === 'number' && Number.isFinite(parsed.ratio)) {
        return { ratio: parsed.ratio, collapsed: parsed.collapsed === 'left' || parsed.collapsed === 'right' ? parsed.collapsed : null }
      }
    }
  } catch {}
  return { ratio: SPLIT_DEFAULT_RATIO, collapsed: null }
}

// Transition mờ dần + phóng nhẹ khi nội dung 1 pane đổi hẳn component (bảng lớp/TKB <-> nhãn
// thu gọn) — cả 2 phía (cũ biến mất, mới xuất hiện) chạy CÙNG LÚC (mode mặc định của
// AnimatePresence), đồng bộ với lúc khung cột đang trượt (.split-animate, 200ms).
const paneSwapMotion = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  style: { height: '100%' },
}

function SplitPeek({ side, icon, label, onExpand }) {
  return (
    <button type="button" className={`split-peek split-peek-${side}`} onClick={onExpand} title={`Mở rộng ${label}`}>
      <span className="split-peek-icon">{icon}</span>
      <span className="split-peek-label">{label}</span>
    </button>
  )
}

export default function App() {
  const [classes, setClasses] = useState(() => store.loadClasses())
  const [filename, setFilename] = useState(() => store.loadFilename())
  const [{ plans, activeId }, setPlanState] = useState(() => store.loadPlans())
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showGuide, setShowGuide] = useState(() => !localStorage.getItem(GUIDE_SEEN_KEY))
  const [showCodes, setShowCodes] = useState(false)
  const [split, setSplit] = useState(loadSplit)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false)
  const [isSplitAnimating, setIsSplitAnimating] = useState(false)
  const mainRef = useRef(null)
  const splitGhostRef = useRef(null)
  const splitDragRef = useRef({ dragging: false, ratio: SPLIT_DEFAULT_RATIO, collapsed: null })
  const splitAnimTimerRef = useRef(null)
  const splitMetricsRef = useRef(null)
  const splitRafRef = useRef(null)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('dkhp.theme.v1')
    if (saved) return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const ttRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('dkhp.theme.v1', theme)
  }, [theme])

  // Đồng bộ tỉ lệ chia cột vào CSS var — chỉ khi không ở chế độ thu gọn
  // (khi thu gọn, class .split-collapsed-* trong CSS tự đặt cột cố định)
  useEffect(() => {
    if (!mainRef.current || split.collapsed) return
    mainRef.current.style.setProperty('--split-a', `${split.ratio}fr`)
    mainRef.current.style.setProperty('--split-b', `${100 - split.ratio}fr`)
  }, [split.ratio, split.collapsed])

  useEffect(() => {
    return () => {
      if (splitAnimTimerRef.current) window.clearTimeout(splitAnimTimerRef.current)
    }
  }, [])

  function persistSplit(next) {
    try { localStorage.setItem(SPLIT_KEY, JSON.stringify(next)) } catch {}
  }

  function commitSplitWithAnimation(next) {
    setSplit(next)
    persistSplit(next)
    setIsSplitAnimating(true)
    if (splitAnimTimerRef.current) window.clearTimeout(splitAnimTimerRef.current)
    splitAnimTimerRef.current = window.setTimeout(() => setIsSplitAnimating(false), 220)
  }

  // Đo kích thước .main MỘT LẦN lúc bắt đầu kéo — không đọc lại getBoundingClientRect/
  // getComputedStyle trong lúc di chuột nữa, vì xen kẽ đọc-sau-ghi mỗi pointermove buộc
  // trình duyệt phải "flush" layout đồng bộ ngay lập tức (layout thrashing) → giật lag.
  function splitRawRatioFromClientX(clientX) {
    const m = splitMetricsRef.current
    if (!m) return 50
    const x = clientX - m.left - SPLIT_RESIZER_W / 2
    return Math.max(1, Math.min(99, (x / m.usable) * 100))
  }

  // Đặt đường ghost (chỉ transform, không đụng tới layout/grid-template-columns thật)
  // — cực rẻ về hiệu năng vì trình duyệt chỉ cần compositing, không cần layout lại.
  function positionSplitGhost(raw) {
    const el = splitGhostRef.current
    const m = splitMetricsRef.current
    if (!el || !m) return
    const px = m.padL + (raw / 100) * m.usable + SPLIT_RESIZER_W / 2
    el.style.transform = `translateX(${px}px)`
  }

  // Chỉ đổi class (không đổi state React) — bên nào đang bị "co lại" thì tối bên đó.
  function setSplitDimSide(side) {
    const el = mainRef.current
    if (!el) return
    el.classList.toggle('split-dim-left', side === 'left')
    el.classList.toggle('split-dim-right', side === 'right')
  }

  // So với tỉ lệ lúc bắt đầu kéo: kéo về phải (raw tăng) = pane trái phình ra, pane phải
  // co lại → tối bên phải. Có ngưỡng nhỏ (0.01) để tránh nhấp nháy khi vừa chạm tay.
  function splitDirectionFromRaw(raw, startRatio) {
    if (raw > startRatio + 0.01) return 'right'
    if (raw < startRatio - 0.01) return 'left'
    return null
  }

  // QUAN TRỌNG: trong suốt lúc kéo (dù đang liên tục hay đang băng qua ngưỡng thu gọn),
  // KHÔNG ghi --split-a/--split-b hay setSplit thật — chỉ cập nhật `pendingCollapsed`
  // (trạng thái "ảo", chưa áp) và di chuyển đường ghost bằng transform. Trước đây, việc
  // BĂNG QUA ngưỡng thu gọn giữa chừng kéo sẽ áp layout thật + tháo/gắn lại ClassTable
  // hoặc Timetable NGAY LẬP TỨC (không animate vì đang kéo tay), gây giật mạnh 1 cái.
  // Giờ toàn bộ thay đổi thật (đổi layout, tháo/gắn component) chỉ xảy ra ĐÚNG 1 LẦN lúc
  // thả tay (onSplitPointerUp), nên chỉ có 1 lần reflow duy nhất, không còn giật giữa chừng.
  function applySplitMove(clientX) {
    const st = splitDragRef.current
    if (!st.dragging) return
    const raw = splitRawRatioFromClientX(clientX)

    if (st.pendingCollapsed === 'left') {
      if (raw > SPLIT_COLLAPSE_EXIT) st.pendingCollapsed = null
    } else if (st.pendingCollapsed === 'right') {
      if (raw < 100 - SPLIT_COLLAPSE_EXIT) st.pendingCollapsed = null
    } else if (raw <= SPLIT_COLLAPSE_ENTER) {
      st.pendingCollapsed = 'left'
    } else if (raw >= 100 - SPLIT_COLLAPSE_ENTER) {
      st.pendingCollapsed = 'right'
    }

    st.ratio = raw
    positionSplitGhost(raw)
    setSplitDimSide(st.pendingCollapsed ?? splitDirectionFromRaw(raw, st.startRatio))
  }

  // Gom nhiều sự kiện pointermove trong cùng 1 khung hình lại thành đúng 1 lần ghi DOM
  // (requestAnimationFrame) — tránh việc ghi/relayout nhiều lần hơn tốc độ trình duyệt vẽ được.
  function onSplitPointerMove(e) {
    const st = splitDragRef.current
    if (!st.dragging) return
    st.pendingClientX = e.clientX
    if (splitRafRef.current != null) return
    splitRafRef.current = requestAnimationFrame(() => {
      splitRafRef.current = null
      applySplitMove(st.pendingClientX)
    })
  }

  function onSplitPointerUp() {
    if (splitRafRef.current != null) {
      cancelAnimationFrame(splitRafRef.current)
      splitRafRef.current = null
    }
    const st = splitDragRef.current
    st.dragging = false
    setIsDraggingSplit(false)
    setSplitDimSide(null)
    window.removeEventListener('pointermove', onSplitPointerMove)
    // Áp trạng thái thật đúng 1 lần tại đây (không phải mỗi khung hình như trước) — dùng
    // animation mượt giống lúc bấm nút, vì layout thật đã bị "đóng băng" suốt lúc kéo nên
    // giờ mới thật sự nhảy tới vị trí cuối, cần animate để không bị giật khô cứng.
    commitSplitWithAnimation({ ratio: st.ratio, collapsed: st.pendingCollapsed })
  }

  function onSplitPointerDown(e) {
    e.preventDefault()
    const rect = mainRef.current?.getBoundingClientRect()
    if (!rect) return
    const style = getComputedStyle(mainRef.current)
    const padL = parseFloat(style.paddingLeft) || 0
    const padR = parseFloat(style.paddingRight) || 0
    splitMetricsRef.current = {
      left: rect.left + padL,
      padL,
      usable: rect.width - padL - padR - SPLIT_RESIZER_W,
    }
    splitDragRef.current = {
      dragging: true,
      ratio: split.ratio,
      pendingCollapsed: split.collapsed,
      pendingClientX: e.clientX,
      startRatio: split.ratio,
    }
    setIsDraggingSplit(true)
    // Đặt ghost đúng ngay vị trí thanh kéo thật hiện tại (dù đang thu gọn hay không) —
    // lấy từ rect thật của chính thanh kéo (e.currentTarget) để ghost không bị "nhảy"
    // ngay khi vừa xuất hiện.
    const resizerRect = e.currentTarget.getBoundingClientRect()
    const ghostEl = splitGhostRef.current
    if (ghostEl) {
      const px = resizerRect.left + resizerRect.width / 2 - rect.left
      ghostEl.style.transform = `translateX(${px}px)`
    }
    setSplitDimSide(split.collapsed || null)
    window.addEventListener('pointermove', onSplitPointerMove)
    window.addEventListener('pointerup', onSplitPointerUp, { once: true })
  }

  function onSplitReset() {
    commitSplitWithAnimation({ ratio: SPLIT_DEFAULT_RATIO, collapsed: null })
  }

  function onSplitSwap() {
    let nextCollapsed
    if (split.collapsed === 'left') nextCollapsed = 'right'
    else if (split.collapsed === 'right') nextCollapsed = 'left'
    else nextCollapsed = split.ratio >= 50 ? 'right' : 'left'
    commitSplitWithAnimation({ ratio: split.ratio, collapsed: nextCollapsed })
  }

  function onSplitExpand(collapsedSide) {
    const other = collapsedSide === 'left' ? 'right' : 'left'
    commitSplitWithAnimation({ ratio: split.ratio, collapsed: other })
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onSplitPointerMove)
      window.removeEventListener('pointerup', onSplitPointerUp)
      if (splitRafRef.current != null) cancelAnimationFrame(splitRafRef.current)
    }
  }, [])

  function closeGuide() {
    setShowGuide(false)
    localStorage.setItem(GUIDE_SEEN_KEY, '1')
  }

  // Lưu phương án mỗi khi thay đổi
  useEffect(() => {
    store.savePlans(plans, activeId)
  }, [plans, activeId])

  const byId = useMemo(() => {
    const m = new Map()
    if (classes) for (const c of classes) m.set(c.id, c)
    return m
  }, [classes])

  const byCode = useMemo(() => buildIndex(classes || []), [classes])

  const [filterMH, setFilterMH] = useState('')

  function handleSelectCourse(code) {
    if (!code) return
    // Khung trái (danh sách lớp) đang bị thu gọn thành nút peek — bấm môn học trên TKB
    // lúc này vô nghĩa vì ClassTable không hiển thị. Tự động lật khung: ẩn TKB, mở khung
    // trái ra để người dùng thấy ngay danh sách lớp đã lọc theo môn vừa bấm.
    if (split.collapsed === 'left') onSplitExpand('left')
    setFilterMH(code)
    setTimeout(() => {
      const el = document.getElementById('input-filter-mh')
      if (el) {
        el.focus()
        const paneLeft = document.querySelector('.pane-left')
        if (paneLeft) {
          paneLeft.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    }, 50)
  }

  const activePlan = plans.find((p) => p.id === activeId) || plans[0]
  const selectedIds = useMemo(() => new Set(activePlan?.selected || []), [activePlan])

  const selectedClasses = useMemo(
    () => (activePlan?.selected || []).map((id) => byId.get(id)).filter(Boolean),
    [activePlan, byId]
  )

  // Tập mã LT có lớp TH con trong toàn bộ danh sách — chỉ phụ thuộc `classes`/`byCode`,
  // KHÔNG phụ thuộc lựa chọn hiện tại, nên tính 1 lần khi đổi file, không tính lại mỗi
  // lần bấm chọn/bỏ chọn lớp (khác với `warnings` cũ vốn quét lại classes.some() mỗi lần).
  const ltWithChildSet = useMemo(() => {
    const set = new Set()
    if (!classes) return set
    for (const c of classes) {
      const p = parentLTCode(c, byCode)
      if (p) set.add(p)
    }
    return set
  }, [classes, byCode])

  // Các lớp bị khóa: trùng lịch HOẶC không khớp LT–TH với lựa chọn hiện tại.
  // Trước đây: so từng lớp trong `classes` (n ~ hàng nghìn) với từng lớp đã chọn (m)
  // — O(n·m), người dùng cảm nhận rõ độ trễ khi file lớn. Giờ dựng trước 2 chỉ mục từ
  // `selectedClasses` (O(m), m luôn nhỏ) rồi chỉ quét `classes` đúng 1 lượt — O(n + m).
  const blocked = useMemo(() => {
    const map = new Map() // id -> lý do
    if (!classes) return map

    // "thu:tiet" -> lớp đã chọn đang chiếm khung giờ đó
    const occupiedSlot = new Map()
    for (const sc of selectedClasses) {
      if (sc.thu == null) continue
      for (const t of sc.tiets) occupiedSlot.set(`${sc.thu}:${t}`, sc)
    }

    // maMH -> các lớp đã chọn cùng môn (đa số lớp trong `classes` không trùng môn với
    // bất kỳ lựa chọn nào nên tra map này loại được ngay, khỏi cần gọi familyIncompatible)
    const selectedByMH = new Map()
    for (const sc of selectedClasses) {
      const arr = selectedByMH.get(sc.maMH)
      if (arr) arr.push(sc)
      else selectedByMH.set(sc.maMH, [sc])
    }

    for (const c of classes) {
      if (selectedIds.has(c.id)) continue

      if (c.thu != null) {
        let conflictSc = null
        for (const t of c.tiets) {
          const sc = occupiedSlot.get(`${c.thu}:${t}`)
          if (sc) { conflictSc = sc; break }
        }
        if (conflictSc) {
          map.set(c.id, `Trùng lịch với ${conflictSc.maLop} (Thứ ${c.thu}, tiết ${c.tiets.join('')})`)
          continue
        }
      }

      const sameMH = selectedByMH.get(c.maMH)
      if (sameMH) {
        for (const sc of sameMH) {
          if (familyIncompatible(c, sc, byCode)) {
            map.set(c.id, incompatReason(c, sc))
            break
          }
        }
      }
    }

    // Lan khóa từ LT sang TH con: nếu lớp LT cha đã bị khóa (trùng lịch hoặc không khớp
    // môn) thì không bao giờ chọn được LT đó nữa, nên các lớp TH thuộc lớp LT này cũng vô
    // nghĩa nếu chọn riêng — khóa luôn để tránh người dùng chọn nhầm rồi bị vướng cảnh báo
    // "thiếu LT" về sau.
    for (const c of classes) {
      if (selectedIds.has(c.id) || map.has(c.id) || !isTH(c)) continue
      const p = parentLTCode(c, byCode)
      const ltClass = p && byCode.get(p)
      if (ltClass && map.has(ltClass.id)) {
        map.set(c.id, `Lớp LT ${p} đã bị khóa: ${map.get(ltClass.id)}`)
      }
    }
    return map
  }, [classes, selectedIds, selectedClasses, byCode])

  const blockedIds = useMemo(() => new Set(blocked.keys()), [blocked])

  // Gợi ý: các lớp TH tương ứng với lớp LT đã chọn (chưa chọn, không bị khóa)
  const suggestIds = useMemo(() => {
    const set = new Set()
    if (!classes) return set
    const ltCodes = new Set(selectedClasses.filter(isLT).map((c) => c.maLop))
    if (ltCodes.size === 0) return set
    for (const c of classes) {
      if (selectedIds.has(c.id) || blocked.has(c.id)) continue
      const p = parentLTCode(c, byCode)
      if (p && ltCodes.has(p)) set.add(c.id)
    }
    return set
  }, [classes, selectedClasses, selectedIds, byCode, blocked])

  // Cảnh báo: LT đã chọn nhưng thiếu TH; TH đã chọn nhưng thiếu LT
  const warnings = useMemo(() => {
    const missingTH = []
    const missingLT = []
    if (!classes) return { missingTH, missingLT }
    const selCodes = new Set(selectedClasses.map((c) => c.maLop))
    for (const s of selectedClasses) {
      if (isLT(s)) {
        if (ltWithChildSet.has(s.maLop)) {
          const childSelected = selectedClasses.some((c) => parentLTCode(c, byCode) === s.maLop)
          if (!childSelected) missingTH.push(s.maLop)
        }
      } else if (isTH(s)) {
        const p = parentLTCode(s, byCode)
        if (p && !selCodes.has(p)) missingLT.push(p)
      }
    }
    return { missingTH, missingLT }
  }, [classes, selectedClasses, byCode, ltWithChildSet])

  const totalTC = useMemo(
    () => selectedClasses.reduce((s, c) => s + (Number(c.soTC) || 0), 0),
    [selectedClasses]
  )

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    clearTimeout(showToast._t)
    showToast._t = setTimeout(() => setToast(null), 3200)
  }

  async function handleFile(file) {
    try {
      setBusy(true)
      const buf = await file.arrayBuffer()
      const parsed = parseWorkbook(buf)
      if (parsed.length === 0) {
        showToast('Không đọc được lớp nào. Kiểm tra lại file có đúng định dạng TKB không.', 'error')
        return
      }
      setClasses(parsed)
      setFilename(file.name)
      store.saveClasses(parsed)
      store.saveFilename(file.name)
      showToast(`Đã tải ${parsed.length} lớp từ "${file.name}".`, 'success')
    } catch (e) {
      console.error(e)
      showToast('Lỗi khi đọc file Excel.', 'error')
    } finally {
      setBusy(false)
    }
  }

  function resetData() {
    if (!confirm('Xóa dữ liệu lớp đã tải? Các phương án đã chọn vẫn được giữ.')) return
    setClasses(null)
    setFilename('')
    store.saveClasses([])
    store.saveFilename('')
  }

  // ---- Chọn / bỏ chọn lớp ----
  function updateActive(mutator) {
    setPlanState((s) => ({
      ...s,
      plans: s.plans.map((p) => (p.id === s.activeId ? mutator(p) : p)),
    }))
  }

  function deleteClass(id) {
    const c = byId.get(id)
    if (!c) return
    if (!confirm(`Xoá lớp ${c.maLop} (${c.tenMH})?`)) return
    setClasses((prev) => prev.filter((x) => x.id !== id))
    store.saveClasses(classes.filter((x) => x.id !== id))
    updateActive((p) => ({ ...p, selected: p.selected.filter((x) => x !== id) }))
    showToast(`Đã xoá lớp ${c.maLop}.`, 'success')
  }

  function toggle(id) {
    const c = byId.get(id)
    if (!c) return
    if (selectedIds.has(id)) {
      updateActive((p) => ({ ...p, selected: p.selected.filter((x) => x !== id) }))
      return
    }
    // Chặn hoàn toàn khi trùng lịch
    const clash = selectedClasses.find((sc) => isConflict(c, sc))
    if (clash) {
      showToast(`Lớp ${c.maLop} trùng lịch với ${clash.maLop} (Thứ ${c.thu}). Không thể chọn.`, 'error')
      return
    }
    // Ràng buộc LT–TH: TH phải khớp mã lớp LT đã chọn (và ngược lại)
    const famClash = selectedClasses.find((sc) => familyIncompatible(c, sc, byCode))
    if (famClash) {
      showToast(`Lớp ${c.maLop}: ${incompatReason(c, famClash)}.`, 'error')
      return
    }
    updateActive((p) => ({ ...p, selected: [...p.selected, id] }))
  }

  // ---- Nhập / Xuất mã lớp ----
  const exportText = useMemo(
    () => selectedClasses.map((c) => c.maLop).join(','),
    [selectedClasses]
  )

  function importCodes(text) {
    const codes = [...new Set(
      String(text).split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)
    )]
    const acc = []       // các lớp đã nhận
    const ids = []
    const notFound = []
    const skipped = []
    for (const code of codes) {
      const c = byCode.get(code)
      if (!c) { notFound.push(code); continue }
      const clash = acc.find((sc) => isConflict(c, sc) || familyIncompatible(c, sc, byCode))
      if (clash) { skipped.push(code); continue }
      acc.push(c)
      ids.push(c.id)
    }
    updateActive((p) => ({ ...p, selected: ids }))
    setShowCodes(false)

    const parts = [`Đã nhập ${ids.length} lớp vào "${activePlan.name}"`]
    if (skipped.length) parts.push(`bỏ ${skipped.length} lớp trùng/lệch (${skipped.join(', ')})`)
    if (notFound.length) parts.push(`không tìm thấy ${notFound.length} mã (${notFound.join(', ')})`)
    showToast(parts.join(' · '), notFound.length || skipped.length ? 'info' : 'success')
  }

  // ---- Quản lý phương án ----
  function addPlan() {
    const id = store.uid()
    const n = plans.length + 1
    setPlanState((s) => ({
      plans: [...s.plans, { id, name: `Phương án ${n}`, selected: [] }],
      activeId: id,
    }))
  }
  function duplicatePlan() {
    const id = store.uid()
    setPlanState((s) => {
      const cur = s.plans.find((p) => p.id === s.activeId)
      const nextNum = s.plans.length + 1
      return {
        plans: [...s.plans, { id, name: `Phương án ${nextNum}`, selected: [...(cur?.selected || [])] }],
        activeId: id,
      }
    })
  }
  function renamePlan() {
    const cur = plans.find((p) => p.id === activeId)
    const name = prompt('Đổi tên phương án:', cur?.name || '')
    if (name && name.trim()) updateActive((p) => ({ ...p, name: name.trim() }))
  }
  function deletePlan() {
    if (plans.length <= 1) { showToast('Phải có ít nhất một phương án.', 'error'); return }
    if (!confirm(`Xóa "${activePlan.name}"?`)) return
    setPlanState((s) => {
      const rest = s.plans.filter((p) => p.id !== s.activeId)
      return { plans: rest, activeId: rest[0].id }
    })
  }
  function clearPlan() {
    if (!confirm(`Bỏ chọn tất cả lớp trong "${activePlan.name}"?`)) return
    updateActive((p) => ({ ...p, selected: [] }))
  }

  async function exportImage() {
    if (!ttRef.current) return
    try {
      setBusy(true)
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#ffffff'
      const dataUrl = await toPng(ttRef.current, {
        pixelRatio: 2,
        backgroundColor: bg,
        cacheBust: true,
      })
      const a = document.createElement('a')
      a.download = `TKB-${activePlan.name.replace(/\s+/g, '_')}.png`
      a.href = dataUrl
      a.click()
      showToast('Đã xuất ảnh thời khóa biểu.', 'success')
    } catch (e) {
      console.error(e)
      showToast('Không xuất được ảnh.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function copyImageToClipboard() {
    if (!ttRef.current) return
    try {
      setBusy(true)
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#ffffff'
      const dataUrl = await toPng(ttRef.current, {
        pixelRatio: 2,
        backgroundColor: bg,
        cacheBust: true,
      })
      // Chuyển dataURL -> Blob -> ClipboardItem
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      showToast('Đã sao chép ảnh TKB vào clipboard!', 'success')
    } catch (e) {
      console.error(e)
      showToast('Không sao chép được. Trình duyệt có thể chưa hỗ trợ.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef(null)
  const [draggedPlanIdx, setDraggedPlanIdx] = useState(null)
  const [dragOverPlanIdx, setDragOverPlanIdx] = useState(null)

  function handleDragStartPlan(e, index) {
    setDraggedPlanIdx(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  function handleDragOverPlan(e, index) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverPlanIdx !== index) {
      setDragOverPlanIdx(index)
    }
  }

  function handleDropPlan(e, targetIndex) {
    e.preventDefault()
    if (draggedPlanIdx !== null && draggedPlanIdx !== targetIndex) {
      setPlanState((s) => {
        const next = [...s.plans]
        const [moved] = next.splice(draggedPlanIdx, 1)
        next.splice(targetIndex, 0, moved)
        return { ...s, plans: next }
      })
    }
    setDraggedPlanIdx(null)
    setDragOverPlanIdx(null)
  }

  function handleDragEndPlan() {
    setDraggedPlanIdx(null)
    setDragOverPlanIdx(null)
  }

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    if (!showExportMenu) return
    function handleClick(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExportMenu])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="app-logo"><img src="/logo.png" alt="Logo" /></span>
          <div>
            <h1>Xếp Thời Khóa Biểu UIT</h1>
            <p>Sắp xếp & so sánh phương án TKB</p>
          </div>
        </div>
        <div className="app-header-right">
          <FileUpload filename={filename} onFile={handleFile} onReset={resetData} />

          <div className="hdr-tools">
            <button
              className="hdr-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>

            <button className="hdr-btn" onClick={() => setShowGuide(true)} title="Hướng dẫn sử dụng">
              <span>❓</span>
              <span>Hướng dẫn</span>
            </button>
          </div>
        </div>
      </header>

      {!classes || classes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">📥</div>
          <h2>Chưa có dữ liệu</h2>
          <p>Tải file Excel TKB (xuất từ trang đăng ký học phần) lên để bắt đầu xếp lịch.</p>
        </div>
      ) : (
        <>
          {/* Thanh phương án */}
          <div className="plan-bar">
            <div className="plan-tabs">
              {plans.map((p, index) => {
                const isActive = p.id === activeId
                const isDragging = draggedPlanIdx === index
                const isDragOver = dragOverPlanIdx === index && draggedPlanIdx !== null && draggedPlanIdx !== index
                const dragDir = isDragOver ? (draggedPlanIdx < index ? 'right' : 'left') : ''

                return (
                  <button
                    key={p.id}
                    draggable
                    onDragStart={(e) => handleDragStartPlan(e, index)}
                    onDragOver={(e) => handleDragOverPlan(e, index)}
                    onDrop={(e) => handleDropPlan(e, index)}
                    onDragEnd={handleDragEndPlan}
                    className={`plan-tab ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? `drag-over drag-over-${dragDir}` : ''}`}
                    onClick={() => setPlanState((s) => ({ ...s, activeId: p.id }))}
                    title="Kéo thả để sắp xếp thứ tự phương án"
                  >
                    <span className="plan-drag-handle">⋮⋮</span>
                    {p.name}
                    <span className="plan-badge">{p.selected.length}</span>
                  </button>
                )
              })}
              <button className="plan-add" onClick={addPlan} title="Thêm phương án">＋</button>
            </div>
            <div className="plan-actions">
              <button className="accent" onClick={() => setShowCodes(true)} title="Nhập / xuất danh sách mã lớp">⇄ Mã lớp</button>
              <button onClick={duplicatePlan} title="Nhân bản phương án hiện tại">Nhân bản</button>
              <button onClick={renamePlan}>Đổi tên</button>
              <button onClick={clearPlan}>Xóa hết lớp</button>
              <button className="danger" onClick={deletePlan}>Xóa phương án</button>
            </div>
          </div>

          <div
            ref={mainRef}
            className={[
              'main',
              split.collapsed === 'left' ? 'split-collapsed-left' : '',
              split.collapsed === 'right' ? 'split-collapsed-right' : '',
              isSplitAnimating ? 'split-animate' : '',
              isDraggingSplit ? 'split-dragging' : '',
            ].filter(Boolean).join(' ')}
          >
            <div ref={splitGhostRef} className="pane-resizer-ghost" aria-hidden="true" />

            {/* Trái: danh sách lớp */}
            <section className="pane pane-left">
              <AnimatePresence initial={false} mode="popLayout">
                {split.collapsed === 'left' ? (
                  <motion.div key="peek-left" className="pane-anim" {...paneSwapMotion}>
                    <SplitPeek side="left" icon="📚" label="Danh sách lớp" onExpand={() => onSplitExpand('left')} />
                  </motion.div>
                ) : (
                  <motion.div key="content-left" className="pane-anim" {...paneSwapMotion}>
                    <ClassTable
                      classes={classes}
                      selectedIds={selectedIds}
                      blockedIds={blockedIds}
                      blockedReason={blocked}
                      suggestIds={suggestIds}
                      onToggle={toggle}
                      filterMH={filterMH}
                      onFilterMHChange={setFilterMH}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <div
              className={`pane-resizer ${isDraggingSplit ? 'is-dragging' : ''}`}
              onPointerDown={onSplitPointerDown}
              onDoubleClick={onSplitReset}
              role="separator"
              aria-orientation="vertical"
              title="Kéo để chỉnh độ rộng · nhấp đúp để đặt lại · ⇄ để đổi bên chiếm ưu thế"
            >
              <button
                type="button"
                className="pane-resizer-swap"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onSplitSwap() }}
                title="Đổi bên chiếm ưu thế"
                aria-label="Đổi bên chiếm ưu thế"
              >
                ⇄
              </button>
            </div>

            {/* Phải: thời khóa biểu */}
            <section className="pane pane-right">
              <AnimatePresence initial={false} mode="popLayout">
                {split.collapsed === 'right' ? (
                  <motion.div key="peek-right" className="pane-anim" {...paneSwapMotion}>
                    <SplitPeek side="right" icon="🗓" label="Thời khóa biểu" onExpand={() => onSplitExpand('right')} />
                  </motion.div>
                ) : (
                  <motion.div key="content-right" className="pane-anim" {...paneSwapMotion}>
              <div className="tt-toolbar">
                <div className="export-split" ref={exportMenuRef}>
                  <button className="btn-primary export-main" onClick={copyImageToClipboard} disabled={busy}>
                    📷 Xuất ảnh TKB
                  </button>
                  <button
                    className="btn-primary export-arrow"
                    onClick={() => setShowExportMenu((v) => !v)}
                    disabled={busy}
                    title="Thêm tuỳ chọn"
                  >
                    ▾
                  </button>
                  {showExportMenu && (
                    <div className="export-menu">
                      <button className="export-menu-item" onClick={() => { exportImage(); setShowExportMenu(false) }}>
                        💾 Tải về (.png)
                      </button>
                      <button className="export-menu-item" onClick={() => { copyImageToClipboard(); setShowExportMenu(false) }}>
                        📋 Sao chép vào clipboard
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {(warnings.missingTH.length > 0 || warnings.missingLT.length > 0) && (
                <div className="warn-bar">
                  {warnings.missingTH.length > 0 && (
                    <div className="warn-item">
                      ⚠ Đã chọn LT nhưng chưa chọn lớp <strong>TH</strong> cho: {warnings.missingTH.join(', ')}
                    </div>
                  )}
                  {warnings.missingLT.length > 0 && (
                    <div className="warn-item">
                      ⚠ Đã chọn TH nhưng chưa chọn lớp <strong>LT</strong>: {warnings.missingLT.join(', ')}
                    </div>
                  )}
                </div>
              )}
              <div className="tt-scroll">
                <Timetable
                  ref={ttRef}
                  classes={selectedClasses}
                  planName={activePlan.name}
                  onDeselect={toggle}
                  onSelectCourse={handleSelectCourse}
                />
              </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>
        </>
      )}

      <GuideModal open={showGuide} onClose={closeGuide} />
      <CodesModal
        open={showCodes}
        onClose={() => setShowCodes(false)}
        exportText={exportText}
        planName={activePlan?.name || ''}
        onImport={importCodes}
      />
      {busy && <div className="busy-overlay">Đang xử lý…</div>}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
