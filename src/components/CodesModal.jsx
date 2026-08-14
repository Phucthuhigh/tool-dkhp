import React, { useEffect, useRef, useState } from 'react'

// Modal Nhập / Xuất mã lớp dạng text (ngăn cách bởi dấu phẩy).
// props:
//  - open, onClose
//  - exportText: chuỗi mã lớp của phương án hiện tại
//  - planName: tên phương án đang active
//  - onImport(text): nhập chuỗi mã lớp vào phương án hiện tại
export default function CodesModal({ open, onClose, exportText, planName, onImport }) {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const taRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setText('')
    setCopied(false)
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function copy() {
    try {
      await navigator.clipboard.writeText(exportText)
    } catch {
      // fallback
      taRef.current?.select()
      document.execCommand?.('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="gm-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-head">
          <h3>⇄ Nhập / Xuất mã lớp</h3>
          <button className="gm-close cm-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="cm-body">
          {/* Nhập */}
          <div className="cm-block">
            <div className="cm-block-head">
              <span className="cm-label">📥 Nhập — dán danh sách mã lớp</span>
            </div>
            <textarea
              className="cm-ta cm-ta-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Dán mã lớp, ngăn cách bằng dấu phẩy. Ví dụ:\nIT004.R113,IT004.R113.1,IT007.R19,IT007.R19.1,MA005.R16'}
            />
            <div className="cm-hint">
              Các mã lớp sẽ được nạp vào phương án <strong>{planName}</strong> (thay cho lựa chọn hiện tại).
              Lớp trùng lịch / lệch LT–TH sẽ tự bị bỏ qua.
            </div>
            <button
              className="cm-import"
              disabled={!text.trim()}
              onClick={() => onImport(text)}
            >
              ⬇ Nhập vào “{planName}”
            </button>
          </div>

          {/* Xuất */}
          <div className="cm-block">
            <div className="cm-block-head">
              <span className="cm-label">📤 Xuất — phương án <strong>{planName}</strong></span>
              <button className="cm-btn" onClick={copy} disabled={!exportText}>
                {copied ? '✓ Đã sao chép' : '📋 Sao chép'}
              </button>
            </div>
            <textarea
              ref={taRef}
              className="cm-ta"
              readOnly
              value={exportText}
              placeholder="Chưa chọn lớp nào trong phương án này."
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
