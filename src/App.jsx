import React, { useEffect, useMemo, useRef, useState } from 'react'
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

export default function App() {
  const [classes, setClasses] = useState(() => store.loadClasses())
  const [filename, setFilename] = useState(() => store.loadFilename())
  const [{ plans, activeId }, setPlanState] = useState(() => store.loadPlans())
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showGuide, setShowGuide] = useState(() => !localStorage.getItem(GUIDE_SEEN_KEY))
  const [showCodes, setShowCodes] = useState(false)
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

  const activePlan = plans.find((p) => p.id === activeId) || plans[0]
  const selectedIds = useMemo(() => new Set(activePlan?.selected || []), [activePlan])

  const selectedClasses = useMemo(
    () => (activePlan?.selected || []).map((id) => byId.get(id)).filter(Boolean),
    [activePlan, byId]
  )

  // Các lớp bị khóa: trùng lịch HOẶC không khớp LT–TH với lựa chọn hiện tại
  const blocked = useMemo(() => {
    const map = new Map() // id -> lý do
    if (!classes) return map
    for (const c of classes) {
      if (selectedIds.has(c.id)) continue
      for (const sc of selectedClasses) {
        if (isConflict(c, sc)) {
          map.set(c.id, `Trùng lịch với ${sc.maLop} (Thứ ${c.thu}, tiết ${c.tiets.join('')})`)
          break
        }
        if (familyIncompatible(c, sc, byCode)) {
          map.set(c.id, incompatReason(c, sc))
          break
        }
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
        const hasChild = classes.some((c) => parentLTCode(c, byCode) === s.maLop)
        if (hasChild) {
          const childSelected = selectedClasses.some((c) => parentLTCode(c, byCode) === s.maLop)
          if (!childSelected) missingTH.push(s.maLop)
        }
      } else if (isTH(s)) {
        const p = parentLTCode(s, byCode)
        if (p && !selCodes.has(p)) missingLT.push(p)
      }
    }
    return { missingTH, missingLT }
  }, [classes, selectedClasses, byCode])

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
      return {
        plans: [...s.plans, { id, name: `${cur.name} (copy)`, selected: [...cur.selected] }],
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="app-logo"><img src="/logo.png" alt="Logo" /></span>
          <div>
            <h1>Tool Đăng Ký Học Phần UIT</h1>
            <p>Xếp thời khóa biểu</p>
          </div>
        </div>
        <div className="app-header-right">
          <button
            className="theme-btn"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="guide-btn" onClick={() => setShowGuide(true)} title="Mở hướng dẫn">
            <span>?</span> Hướng dẫn
          </button>
          <FileUpload filename={filename} onFile={handleFile} onReset={resetData} />
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
              {plans.map((p) => (
                <button
                  key={p.id}
                  className={`plan-tab ${p.id === activeId ? 'active' : ''}`}
                  onClick={() => setPlanState((s) => ({ ...s, activeId: p.id }))}
                >
                  {p.name}
                  <span className="plan-badge">{p.selected.length}</span>
                </button>
              ))}
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

          <div className="main">
            {/* Trái: danh sách lớp */}
            <section className="pane pane-left">
              <ClassTable
                classes={classes}
                selectedIds={selectedIds}
                blockedIds={blockedIds}
                blockedReason={blocked}
                suggestIds={suggestIds}
                onToggle={toggle}
              />
            </section>

            {/* Phải: thời khóa biểu */}
            <section className="pane pane-right">
              <div className="tt-toolbar">
                <div className="tt-stats">
                  <span><strong>{selectedClasses.length}</strong> lớp</span>
                  <span><strong>{totalTC}</strong> tín chỉ</span>
                </div>
                <button className="btn-primary" onClick={exportImage} disabled={busy}>
                  📷 Xuất ảnh TKB
                </button>
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
                <Timetable ref={ttRef} classes={selectedClasses} planName={activePlan.name} />
              </div>
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
