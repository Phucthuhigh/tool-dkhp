import React from 'react'

export default function Footer({ mode = 'full' }) {
  return (
    <footer className={`footer-bar ${mode === 'slim' ? 'footer-slim' : ''}`}>
      <div className="footer-center">
        <span className="footer-disclaimer">
          ⚠ Website cá nhân hỗ trợ xếp lịch, không thuộc quyền sở hữu của trường UIT.
        </span>
      </div>

      <div className="footer-right">
        <a
          href="https://everytime.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-source-link"
          title="Mở ứng dụng Everytime trong tab mới"
        >
          ℹ️ Đánh giá GV từ <span className="footer-link-highlight">Everytime ↗</span>
        </a>
      </div>
    </footer>
  )
}
