import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { autoScheduleEngine } from '../lib/autoSchedule.js'
import { getProfReviewData, getProfBadgeInfo } from '../lib/profReview.js'
import { DAYS, TIET_LIST, formatTiet } from '../lib/tiet.js'

const AUTO_STORAGE_KEY = 'dkhp.autoScheduleState.v1'

// Bảng màu chuẩn như trong thiết kế mẫu
const SUBJECT_COLORS = [
  { code: '#818cf8', bg: '#818cf8', text: '#ffffff' }, // Purple-blue
  { code: '#c084fc', bg: '#c084fc', text: '#ffffff' }, // Purple
  { code: '#fb923c', bg: '#fb923c', text: '#ffffff' }, // Orange
  { code: '#f472b6', bg: '#f472b6', text: '#ffffff' }, // Pink
  { code: '#38bdf8', bg: '#38bdf8', text: '#ffffff' }, // Sky Blue
  { code: '#64748b', bg: '#64748b', text: '#ffffff' }, // Slate Gray
  { code: '#fbbf24', bg: '#fbbf24', text: '#ffffff' }, // Amber Yellow
  { code: '#34d399', bg: '#34d399', text: '#ffffff' }, // Emerald
]

function getCourseColor(key) {
  let h = 0
  const s = String(key || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return SUBJECT_COLORS[h % SUBJECT_COLORS.length].bg
}

// Mini Timetable Grid cho từng Phương án TKB
function OptionTimetable({ classes, onProfClick }) {
  // Map ngày (2..7) + tiết (1..10) -> lớp
  const gridMap = useMemo(() => {
    const map = new Map()
    classes.forEach((c) => {
      if (c.thu && c.tiets && c.tiets.length > 0) {
        c.tiets.forEach((t) => {
          map.set(`${c.thu}:${t}`, c)
        })
      }
    })
    return map
  }, [classes])

  // Danh sách môn độc bản làm Legend Box
  const courseLegend = useMemo(() => {
    const map = new Map()
    classes.forEach((c) => {
      const code = c.maMH || c.maLop
      if (!map.has(code)) {
        map.set(code, {
          maMH: c.maMH,
          tenMH: c.tenMH,
          color: getCourseColor(code),
        })
      }
    })
    return Array.from(map.values())
  }, [classes])

  return (
    <div className="opt-tt-wrap">
      {/* Lưới thời khóa biểu */}
      <div className="opt-tt-grid">
        <div className="opt-tt-corner"></div>
        {DAYS.map((d) => (
          <div key={d.key} className="opt-tt-day-head">
            T{d.key}
          </div>
        ))}

        {TIET_LIST.map((tiet) => (
          <React.Fragment key={tiet}>
            <div className="opt-tt-time">{tiet}</div>
            {DAYS.map((d) => {
              const c = gridMap.get(`${d.key}:${tiet}`)
              const courseCode = c ? c.maMH || c.maLop : null
              const color = c ? getCourseColor(courseCode) : 'transparent'

              return (
                <div
                  key={`${d.key}-${tiet}`}
                  className={`opt-tt-cell ${c ? 'has-class' : ''}`}
                  style={{
                    backgroundColor: c ? color : undefined,
                  }}
                  title={
                    c
                      ? `${c.tenMH} (${c.maLop})\nGV: ${c.tenGV || '—'}\nTiết ${formatTiet(c.tiets)} | Phòng ${c.phong || '—'}`
                      : `Tiết ${tiet} - Thứ ${d.key} (Rảnh)`
                  }
                >
                  {c && <span className="opt-cell-code">{c.maMH || c.maLop}</span>}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend Box Chú thích màu môn học bên dưới */}
      <div className="opt-legend-box">
        <div className="opt-legend-items">
          {courseLegend.map((item, idx) => (
            <div key={idx} className="opt-legend-chip">
              <span className="opt-legend-square" style={{ backgroundColor: item.color }} />
              <strong className="opt-legend-code" style={{ color: item.color }}>
                {item.maMH}
              </strong>
              <span className="opt-legend-name">{item.tenMH}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AutoScheduleModal({
  open,
  onClose,
  allClasses = [],
  onApplyPlan,
  onProfClick,
}) {
  const [step, setStep] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [studentCohort, setStudentCohort] = useState('')
  const [preferredOffDays, setPreferredOffDays] = useState([])
  const [results, setResults] = useState([])
  const [isJittering, setIsJittering] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)

  // Load persisted state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTO_STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (data.selectedSubjects) setSelectedSubjects(data.selectedSubjects)
        if (data.studentCohort) setStudentCohort(data.studentCohort)
        if (data.preferredOffDays) setPreferredOffDays(data.preferredOffDays)
        if (data.searchInput) setSearchInput(data.searchInput)
      }
    } catch (e) {}
  }, [])

  // Save persisted state
  useEffect(() => {
    try {
      localStorage.setItem(
        AUTO_STORAGE_KEY,
        JSON.stringify({
          selectedSubjects,
          studentCohort,
          preferredOffDays,
          searchInput,
        })
      )
    } catch (e) {}
  }, [selectedSubjects, studentCohort, preferredOffDays, searchInput])

  // Danh sách môn học chuẩn bị dữ liệu
  const subjectListInfo = useMemo(() => {
    const map = new Map()
    allClasses.forEach((c) => {
      if (!c.maMH) return
      const code = c.maMH.trim().toUpperCase()
      if (!map.has(code)) {
        map.set(code, {
          maMH: code,
          tenMH: c.tenMH,
          soTC: Number(c.soTC) || 0,
          classes: [],
          hasLT: false,
          hasTH: false,
        })
      }
      const item = map.get(code)
      item.classes.push(c)
      if (c.htgd === 'LT') item.hasLT = true
      if (c.htgd === 'HT1' || c.htgd === 'HT2') item.hasTH = true
    })

    return Array.from(map.values())
  }, [allClasses])

  // Tính tổng số tín chỉ của các môn đã chọn
  const selectedTC = useMemo(() => {
    const selectedSet = new Set(selectedSubjects)
    return subjectListInfo
      .filter((s) => selectedSet.has(s.maMH))
      .reduce((sum, s) => sum + s.soTC, 0)
  }, [selectedSubjects, subjectListInfo])

  // Bộ lọc môn theo ô search (phân tách phẩy, chấm phẩy, khoảng trắng, xuống dòng)
  const filteredSubjects = useMemo(() => {
    if (!searchInput.trim()) return subjectListInfo
    const terms = searchInput
      .split(/[\s,;\n]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)

    return subjectListInfo.filter((s) => {
      const code = s.maMH.toUpperCase()
      const name = s.tenMH.toUpperCase()
      return terms.some((term) => code.includes(term) || name.includes(term))
    })
  }, [subjectListInfo, searchInput])

  // Tự động trích xuất danh sách tất cả các Khóa học có trong file Excel TKB
  const dynamicCohorts = useMemo(() => {
    const set = new Set()
    allClasses.forEach((c) => {
      const raw = c.khoaDKHP || c.khoa
      if (!raw) return
      const parts = String(raw)
        .split(/[\s,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)

      parts.forEach((p) => {
        const upper = p.toUpperCase()
        if (/^\d{2}$/.test(upper)) {
          set.add(`K${upper}`)
        } else if (upper) {
          set.add(upper)
        }
      })
    })

    // Mặc định hỗ trợ thêm nếu file rỗng
    const defaults = ['K20', 'K19', 'K18', 'K17', 'K16']
    defaults.forEach((k) => set.add(k))

    return Array.from(set).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  }, [allClasses])

  function toggleSubject(maMH) {
    setSelectedSubjects((prev) =>
      prev.includes(maMH) ? prev.filter((x) => x !== maMH) : [...prev, maMH]
    )
  }

  function unselectSubject(maMH) {
    setSelectedSubjects((prev) => prev.filter((x) => x !== maMH))
  }

  function clearAllSelected() {
    setSelectedSubjects([])
  }

  function handleSelectAllFiltered() {
    const filteredCodes = filteredSubjects.map((s) => s.maMH)
    const newSelected = Array.from(new Set([...selectedSubjects, ...filteredCodes]))
    setSelectedSubjects(newSelected)
  }

  function toggleOffDay(dayNum) {
    setPreferredOffDays((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum]
    )
  }

  function runAutoSchedule(jitter = false) {
    if (selectedSubjects.length === 0 || isScheduling) return
    setIsScheduling(true)
    setIsJittering(true)
    setResults([])
    setTimeout(() => {
      const plans = autoScheduleEngine(selectedSubjects, allClasses, {
        studentCohort,
        preferredDaysOff: preferredOffDays,
        topK: 5,
        jitter,
      })
      setResults(plans)
      setIsJittering(false)
      setIsScheduling(false)
      setStep(2)
    }, 150)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="asm-backdrop" onClick={onClose}>
        <motion.div
          className="asm-modal"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Nút Đóng Modal */}
          <button type="button" className="asm-close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>

          {/* Header Giống Ảnh */}
          <div className="asm-header">
            <div className="asm-title-row">
              <span className="asm-sparkle-icon">✨</span>
              <h2>Tự động xếp thời khóa biểu</h2>
            </div>
            <p className="asm-subtitle">
              Chọn môn học & ngày trống, hệ thống sẽ tối ưu điểm giảng viên và xếp lịch giúp bạn!
            </p>

            {/* Stepper Progress Bar */}
            <div className="asm-stepper">
              <div className={`asm-step-item ${step === 1 ? 'active' : 'completed'}`}>
                <span className="asm-step-num">1</span>
                <span className="asm-step-label">Chọn môn & Yêu cầu</span>
              </div>
              <div className="asm-step-line" />
              <div className={`asm-step-item ${step === 2 ? 'active' : ''}`}>
                <span className="asm-step-num">2</span>
                <span className="asm-step-label">Kết quả ({results.length || 3})</span>
              </div>
            </div>
          </div>

          {/* Nội dung Bước 1 */}
          {step === 1 ? (
            <div className="asm-body">
              {isScheduling && (
                <div className="asm-loading-overlay" aria-live="polite">
                  <div className="asm-loading-spinner" />
                  <div className="asm-loading-text">Đang tìm phương án tối ưu cho bạn...</div>
                </div>
              )}

              {/* Box 1: Môn học đã chọn */}
              {selectedSubjects.length > 0 && (
                <div className="asm-selected-box">
                  <div className="asm-box-head">
                    <span className="asm-box-title">
                      📖 Môn học đã chọn <strong>({selectedSubjects.length} môn • {selectedTC} tín chỉ)</strong>
                    </span>
                    <button type="button" className="asm-clear-btn" onClick={clearAllSelected}>
                      🗑 Bỏ chọn hết
                    </button>
                  </div>
                  <div className="asm-selected-chips">
                    {selectedSubjects.map((code) => {
                      const info = subjectListInfo.find((s) => s.maMH === code)
                      return (
                        <div key={code} className="asm-chip">
                          <strong className="asm-chip-code">{code}</strong>
                          <span className="asm-chip-name">{info?.tenMH || ''}</span>
                          <span className="asm-chip-tc">{info?.soTC || 3} TC</span>
                          <button
                            type="button"
                            className="asm-chip-remove"
                            onClick={() => unselectSubject(code)}
                            title="Xóa môn này"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Box 2: Tìm & Chọn môn học */}
              <div className="asm-search-section">
                <label className="asm-section-label">Tìm & chọn môn học</label>
                <div className="asm-search-bar">
                  <span className="asm-search-icon">🔍</span>
                  <input
                    type="text"
                    className="asm-search-input"
                    placeholder="Ví dụ: it007 it004 nt209 nt106 ma005 ss006..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      className="asm-search-clear"
                      onClick={() => setSearchInput('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="asm-select-all-row">
                  <button
                    type="button"
                    className="asm-btn-select-all"
                    onClick={handleSelectAllFiltered}
                  >
                    ✓ Chọn tất cả {filteredSubjects.length} môn đang lọc
                  </button>
                </div>
              </div>

              {/* Danh sách thẻ môn học có Checkbox */}
              <div className="asm-subjects-list">
                {filteredSubjects.map((s) => {
                  const isChecked = selectedSubjects.includes(s.maMH)
                  const typeLabel =
                    s.hasLT && s.hasTH
                      ? 'Lý thuyết + Thực hành'
                      : s.hasTH
                      ? 'Thực hành'
                      : 'Lý thuyết'

                  return (
                    <div
                      key={s.maMH}
                      className={`asm-subject-row ${isChecked ? 'is-selected' : ''}`}
                      onClick={() => toggleSubject(s.maMH)}
                    >
                      <div className="asm-row-left">
                        <input
                          type="checkbox"
                          className="asm-checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                        />
                        <div className="asm-subj-detail">
                          <div className="asm-subj-title">{s.tenMH}</div>
                          <div className="asm-subj-meta">
                            <strong className="asm-meta-code">{s.maMH}</strong> •{' '}
                            <strong>{s.soTC} Tín chỉ</strong> • {s.classes.length} lớp mở ({typeLabel})
                          </div>
                        </div>
                      </div>
                      <div className="asm-row-right">
                        {isChecked && <span className="asm-check-mark">✓</span>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Cài đặt tiêu chí Khóa học & Ngày nghỉ */}
              <div className="asm-options-grid">
                <div className="asm-option-box">
                  <label className="asm-opt-label">🎓 Khóa học của sinh viên:</label>
                  <select
                    className="asm-opt-select"
                    value={studentCohort}
                    onChange={(e) => setStudentCohort(e.target.value)}
                  >
                    <option value="">Tất cả các Khóa (Mở chung)</option>
                    {dynamicCohorts.map((c) => (
                      <option key={c} value={c}>
                        {c.startsWith('K') ? `Khóa ${c.slice(1)} (${c})` : `Khóa ${c}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="asm-option-box">
                  <label className="asm-opt-label">🗓 Ưu tiên nghỉ các ngày:</label>
                  <div className="asm-days-group">
                    {[2, 3, 4, 5, 6, 7].map((d) => {
                      const isChecked = preferredOffDays.includes(d)
                      return (
                        <button
                          key={d}
                          type="button"
                          className={`asm-day-pill ${isChecked ? 'selected' : ''}`}
                          onClick={() => toggleOffDay(d)}
                        >
                          Thứ {d}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Footer nút hành động */}
              <div className="asm-action-footer">
                <button
                  type="button"
                  className="asm-btn-submit"
                  disabled={selectedSubjects.length === 0 || isScheduling}
                  onClick={() => runAutoSchedule(false)}
                >
                  {isScheduling ? 'Đang xếp lịch...' : 'Tiếp tục: Xếp lịch tự động ➔'}
                </button>
              </div>
            </div>
          ) : (
            /* Nội dung Bước 2: Kết quả */
            <div className="asm-body">
              {/* Thanh Điều hướng Bước 2 */}
              <div className="asm-step2-nav">
                <button
                  type="button"
                  className="asm-btn-back"
                  onClick={() => setStep(1)}
                >
                  ← Điều chỉnh môn & ngày trống
                </button>
                <button
                  type="button"
                  className="asm-btn-retry"
                  onClick={() => runAutoSchedule(true)}
                  disabled={isJittering || isScheduling}
                >
                  {isJittering ? 'Đang thử phương án khác...' : '🔄 Thử xếp phương án khác'}
                </button>
              </div>

              {/* Thông báo số lượng phương án */}
              <div className="asm-summary-banner">
                Tìm thấy <strong>{results.length}</strong> phương án thời khóa biểu phù hợp nhất cho{' '}
                <strong>{selectedSubjects.length}</strong> môn ({selectedTC} tín chỉ)!
              </div>

              {/* Danh sách các Phương án Card */}
              {results.length > 0 ? (
                <div className="asm-plans-stack">
                  {results.map((plan, index) => (
                    <div key={plan.id} className="asm-plan-card">
                      {/* Card Header */}
                      <div className="asm-card-head">
                        <div className="asm-card-title">
                          Phương án #{index + 1}
                        </div>
                        <div className="asm-card-badges">
                          <span className="asm-badge-prof">
                            ⭐ GV: {plan.profRating}/5
                          </span>
                          <span className="asm-badge-off">
                            📅 Trống {plan.achievedDaysOff.length}/{preferredOffDays.length || 1} ngày yêu cầu
                          </span>
                          <span className="asm-badge-info">
                            {plan.totalTC} Tín chỉ ({plan.classes.length} lớp)
                          </span>
                          <button
                            type="button"
                            className="asm-btn-apply-plan"
                            onClick={() => {
                              onApplyPlan?.(plan.classes)
                              onClose()
                            }}
                          >
                            Áp dụng phương án 🚀
                          </button>
                        </div>
                      </div>

                      {/* Mini Timetable Grid cho Phương án */}
                      <OptionTimetable classes={plan.classes} onProfClick={onProfClick} />

                      {/* Chi tiết danh sách lớp học trong phương án */}
                      <div className="asm-plan-classes-table">
                        <div className="asm-classes-head">Chi tiết các lớp học đã chọn:</div>
                        <div className="asm-classes-list">
                          {plan.classes.map((c) => {
                            const profInfo = c.tenGV ? getProfReviewData(c.tenGV) : null
                            const badge = profInfo ? getProfBadgeInfo(profInfo.rating) : null
                            const typeTag = c.htgd === 'LT' ? '(LT)' : c.htgd ? `(${c.htgd})` : ''

                            return (
                              <div key={c.id} className="asm-class-item">
                                <div className="asm-ci-code">
                                  <strong>{c.maLop}</strong>
                                  <span className="asm-ci-name">{c.tenMH} {typeTag}</span>
                                </div>
                                <div className="asm-ci-time">
                                  {c.thu ? `Thứ ${c.thu} • Tiết ${formatTiet(c.tiets)} (${c.soTC} TC)` : 'Giờ tự do'}
                                </div>
                                <div className="asm-ci-prof">
                                  {c.tenGV ? (
                                    <button
                                      type="button"
                                      className="asm-ci-prof-btn"
                                      onClick={() => onProfClick?.(c.tenGV)}
                                    >
                                      {c.tenGV}
                                      {badge && <span className={badge.className} style={{ marginLeft: 4 }}>{badge.scoreText}</span>}
                                    </button>
                                  ) : (
                                    '—'
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="asm-empty-state">
                  <div className="asm-empty-icon">⚠️</div>
                  <h3>Không tìm thấy phương án TKB phù hợp nào</h3>
                  <p>Các môn học bạn chọn có thể bị trùng lịch hoặc bị hạn chế bởi Khóa học.</p>
                  <button
                    type="button"
                    className="asm-btn-back"
                    onClick={() => setStep(1)}
                    style={{ marginTop: 12 }}
                  >
                    ← Quay lại chỉnh sửa danh sách môn
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
