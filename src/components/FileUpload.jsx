import React, { useRef, useState } from 'react'

export default function FileUpload({ filename, onFile, onReset }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)

  function pick(files) {
    const f = files && files[0]
    if (f) onFile(f)
  }

  return (
    <div
      className={`fu ${drag ? 'fu-drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      <div className="fu-icon">📄</div>
      <div className="fu-text">
        {filename ? (
          <>
            <strong>{filename}</strong>
            <div className="fu-sub">Nhấn để chọn file khác, hoặc kéo thả file .xlsx vào đây</div>
          </>
        ) : (
          <>
            <strong>Tải file Excel TKB lên</strong>
            <div className="fu-sub">Kéo thả hoặc nhấn để chọn file (.xlsx) xuất từ trang đăng ký</div>
          </>
        )}
      </div>
      {filename && (
        <button
          className="fu-reset"
          onClick={(e) => { e.stopPropagation(); onReset() }}
          title="Xóa dữ liệu đã tải"
        >
          Xóa
        </button>
      )}
    </div>
  )
}
