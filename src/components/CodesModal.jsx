import React, { useEffect, useMemo, useRef, useState } from 'react'

function HighlightedScript({ codes }) {
  const formattedCodes = codes || ''

  return (
    <pre className="cm-code">
      <span className="cm-c-kw">var</span> monDangKy = <span className="cm-c-str">"{formattedCodes}"</span>;{'\n\n'}
      <span className="cm-c-kw">var</span> successLog = (message) =&gt; console.log(<span className="cm-c-str">'%c'</span> + message, <span className="cm-c-str">'font-weight:bold; color:green;'</span>);{'\n'}
      <span className="cm-c-kw">var</span> errorLog = (message) =&gt; console.log(<span className="cm-c-str">'%c'</span> + message, <span className="cm-c-str">'font-weight:bold; color:red;'</span>);{'\n\n'}
      <span className="cm-c-fn">DangKy</span>(monDangKy);{'\n\n'}
      <span className="cm-c-kw">function</span> <span className="cm-c-fn">DangKy</span>(monDangKyString) {'{'}{'\n'}
      {'  '}<span className="cm-c-kw">try</span> {'{'}{'\n'}
      {'    '}<span className="cm-c-kw">var</span> listMonDangKy = monDangKyString.split(<span className="cm-c-str">','</span>).map((it) =&gt; it.trim()).filter(Boolean);{'\n'}
      {'    '}<span className="cm-c-kw">var</span> allRows = [...document.querySelectorAll(<span className="cm-c-str">'form table tr'</span>)];{'\n'}
      {'    '}<span className="cm-c-kw">var</span> rowsToDangKy = allRows.filter((it) =&gt; listMonDangKy.includes(it.querySelector(<span className="cm-c-str">'td:nth-child(2)'</span>)?.textContent?.trim()));{'\n'}
      {'    '}rowsToDangKy.forEach((it, index) =&gt; {'{'}{'\n'}
      {'      '}it.querySelector(<span className="cm-c-str">'td:first-child input[type="checkbox"]'</span>)?.click();{'\n'}
      {'      '}<span className="cm-c-kw">var</span> tenLop = it.querySelector(<span className="cm-c-str">'td:nth-child(2)'</span>)?.textContent?.trim();{'\n'}
      {'      '}successLog(index + 1 + <span className="cm-c-str">'.Đã chọn lớp '</span> + tenLop);{'\n'}
      {'    '}{'}'});{'\n'}
      {'  '}{'}'} <span className="cm-c-kw">catch</span> {'{'}{'\n'}
      {'    '}errorLog(<span className="cm-c-str">'Chọn lớp không thành công! Bạn tự chọn lớp đi nhé!'</span>);{'\n'}
      {'  '}{'}'}{'\n'}
      {'}'}
    </pre>
  )
}

export default function CodesModal({ open, onClose, exportText, planName, onImport }) {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [scriptCopied, setScriptCopied] = useState(false)
  const taRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setText('')
    setCopied(false)
    setScriptCopied(false)
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const generatedScript = useMemo(() => {
    const formattedCodes = exportText || ''
    return `// Copy đoạn script này dán vào F12 Console ở trang đăng ký học phần
// Lưu ý: Nếu sau này trường update website, các thẻ query không còn đúng nữa, thì bạn liên hệ messenger.com/t/loia5tqd001 để báo mình nhé

var monDangKy = "${formattedCodes}";

var successLog = (message) => console.log('%c' + message, 'font-weight:bold; color:green;');
var errorLog = (message) => console.log('%c' + message, 'font-weight:bold; color:red;');

DangKy(monDangKy);

function DangKy(monDangKyString) {
  try {
    var listMonDangKy = monDangKyString.split(',').map((it) => it.trim()).filter(Boolean);
    var allRows = [...document.querySelectorAll('form table tr')];
    var rowsToDangKy = allRows.filter((it) => listMonDangKy.includes(it.querySelector('td:nth-child(2)')?.textContent?.trim()));
    rowsToDangKy.forEach((it, index) => {
      it.querySelector('td:first-child input[type="checkbox"]')?.click();
      var tenLop = it.querySelector('td:nth-child(2)')?.textContent?.trim();
      successLog(index + 1 + '.Đã chọn lớp ' + tenLop);
    });
  } catch {
    errorLog('Chọn lớp không thành công! Bạn tự chọn lớp đi nhé!');
  }
}`
  }, [exportText])

  if (!open) return null

  async function copy() {
    try {
      await navigator.clipboard.writeText(exportText)
    } catch {
      taRef.current?.select()
      document.execCommand?.('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(generatedScript)
    } catch {
      // fallback
    }
    setScriptCopied(true)
    setTimeout(() => setScriptCopied(false), 1600)
  }

  return (
    <div className="gm-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-head">
          <h3>⇄ Nhập / Xuất mã lớp & Script Đăng ký</h3>
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
              <span className="cm-label">📤 Xuất mã lớp — <strong>{planName}</strong></span>
              <button className="cm-btn" onClick={copy} disabled={!exportText}>
                {copied ? '✓ Đã sao chép' : '📋 Sao chép mã lớp'}
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

          {/* Script đăng ký nhanh */}
          <div className="cm-block">
            <div className="cm-block-head">
              <span className="cm-label">⚡ Script đăng ký nhanh (Console F12)</span>
              <button className="cm-btn cm-btn-script" onClick={copyScript} disabled={!exportText}>
                {scriptCopied ? '✓ Đã sao chép script' : '📋 Sao chép script'}
              </button>
            </div>
            <div className="cm-hint">
              Mở trang Đăng ký học phần ➔ Nhấn <strong>F12</strong> (Console) ➔ Dán đoạn script bên dưới và nhấn <strong>Enter</strong> để tự động tích chọn checkbox các môn đã chọn.
            </div>
            <div className="cm-code-wrap">
              <HighlightedScript codes={exportText} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
