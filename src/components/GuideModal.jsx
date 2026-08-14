import React, { useEffect } from 'react'

const STEPS = [
  {
    icon: '📤',
    title: 'Tải file Excel TKB lên',
    desc: 'Kéo thả hoặc bấm vào ô tải file ở góc trên. Tool tự đọc cả 2 sheet và liệt kê toàn bộ lớp.',
  },
  {
    icon: '✅',
    title: 'Tích chọn lớp muốn học',
    desc: 'Bấm checkbox để đưa lớp lên lưới thời khóa biểu. Dùng bộ lọc từng cột hoặc nút LT / TH để tìm nhanh.',
  },
  {
    icon: '⇄',
    title: 'Nhập danh sách mã lớp nhanh',
    desc: 'Bấm nút "⇄ Mã lớp" ở thanh phương án: dán danh sách mã lớp (phân cách bởi dấu phẩy hoặc dòng mới), tool sẽ tự động tìm và chèn thẳng các lớp đó vào TKB.',
  },
  {
    icon: '🧩',
    title: 'Xếp — tool tự kiểm tra giúp bạn',
    desc: 'Lớp trùng lịch bị khóa đỏ; chọn lớp Lý thuyết thì lớp Thực hành tương ứng được gợi ý xanh.',
  },
  {
    icon: '🗂️',
    title: 'Lưu nhiều phương án',
    desc: 'Tạo Phương án 1, 2, 3… để dự phòng khi tranh lớp. Mọi thứ tự lưu, tắt trình duyệt không mất.',
  },
  {
    icon: '📷',
    title: 'Xuất ảnh hoặc sao chép TKB',
    desc: 'Ưng phương án nào thì bấm nút "Xuất ảnh TKB" để tải file PNG hoặc sao chép trực tiếp vào clipboard.',
  },
]

const FEATURES = [
  { icon: '📊', title: 'Đọc Excel tự động', desc: 'Gộp cả sheet LT và TH, tự dò cột.' },
  { icon: '🔎', title: 'Lọc mọi cột', desc: 'Môn, mã lớp, GV, thứ, tiết (khoảng 1-5 hoặc số 3), phòng, khóa học, học kỳ.' },
  { icon: '⇄', title: 'Nhập / xuất mã lớp', desc: 'Dán danh sách mã lớp để tự động chèn nhanh vào TKB.' },
  { icon: '⛔', title: 'Chặn trùng lịch', desc: 'Không cho chọn lớp trùng thứ + tiết.' },
  { icon: '🔗', title: 'Ràng buộc LT ↔ TH', desc: 'Lớp TH phải khớp mã lớp LT đã chọn.' },
  { icon: '↕️', title: 'Xem ngang / Xem dọc', desc: 'Tùy chọn bố cục xếp 2 cột ngang hoặc cuộn dọc.' },
  { icon: '📋', title: 'Sao chép ảnh TKB', desc: 'Copy ảnh TKB trực tiếp vào clipboard để gửi nhanh.' },
  { icon: '💾', title: 'Nhiều phương án', desc: 'Lưu vào trình duyệt, so sánh dễ dàng.' },
  { icon: '🧮', title: 'Tính tổng tín chỉ', desc: 'Cập nhật số TC theo từng phương án.' },
]

export default function GuideModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="gm-overlay" onClick={onClose}>
      <div className="gm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Banner */}
        <div className="gm-banner">
          <button className="gm-close" onClick={onClose} aria-label="Đóng">✕</button>
          <div className="gm-banner-icon">🗓️</div>
          <h2>Hướng dẫn sử dụng</h2>
          <p>Xếp thời khóa biểu UIT trong vài phút — chọn lớp, so sánh phương án, xuất ảnh.</p>
        </div>

        <div className="gm-body">
          {/* Tính năng */}
          <section className="gm-section">
            <div className="gm-sec-head"><span className="gm-sec-num">1</span><h3>Tính năng nổi bật</h3></div>
            <div className="gm-features">
              {FEATURES.map((f, i) => (
                <div key={i} className="gm-feat">
                  <span className="gm-feat-icon">{f.icon}</span>
                  <div>
                    <div className="gm-feat-title">{f.title}</div>
                    <div className="gm-feat-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Chuẩn bị file */}
          <section className="gm-section">
            <div className="gm-sec-head"><span className="gm-sec-num">2</span><h3>Chuẩn bị file Excel</h3></div>
            <div className="gm-file-card">
              <ul className="gm-check">
                <li>File <strong>.xlsx</strong> xuất từ trang đăng ký học phần (danh sách lớp học kỳ).</li>
                <li>Giữ nguyên các cột gốc: <em>Mã MH, Mã lớp, Tên môn học, Tên giảng viên, Số TC, Thứ, Tiết, Phòng học…</em></li>
                <li>Có thể gồm 2 sheet <em>“TKB LT”</em> và <em>“TKB TH, ĐA, KLTN, TTTN”</em> — tool đọc cả hai.</li>
                <li>Cột <strong>Thứ</strong> ghi số 2–7; cột <strong>Tiết</strong> ghi liền nhau (vd <code>123</code>, <code>678910</code>).</li>
              </ul>
              <div className="gm-note gm-note-ok">
                🔒 Dữ liệu chỉ xử lý ngay trên máy bạn — <strong>không gửi lên bất kỳ máy chủ nào</strong>.
              </div>
            </div>
          </section>

          {/* Các bước */}
          <section className="gm-section">
            <div className="gm-sec-head"><span className="gm-sec-num">3</span><h3>Các bước sử dụng</h3></div>
            <ol className="gm-steps">
              {STEPS.map((s, i) => (
                <li key={i} className="gm-step">
                  <span className="gm-step-icon">{s.icon}</span>
                  <div className="gm-step-body">
                    <div className="gm-step-title">{s.title}</div>
                    <div className="gm-step-desc">{s.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Chú thích màu */}
          <section className="gm-section">
            <div className="gm-legend">
              <span className="gm-lg"><i className="gm-dot gm-dot-sel" /> Đã chọn</span>
              <span className="gm-lg"><i className="gm-dot gm-dot-block" /> Bị khóa (trùng lịch / lệch LT–TH)</span>
              <span className="gm-lg"><i className="gm-dot gm-dot-sug" /> TH gợi ý theo lớp LT</span>
            </div>
          </section>
        </div>

        <div className="gm-footer">
          <span className="gm-footer-hint">Mở lại hướng dẫn bất cứ lúc nào ở nút <strong>“? Hướng dẫn”</strong> trên đầu trang.</span>
          <button className="gm-start" onClick={onClose}>Bắt đầu ngay →</button>
        </div>
      </div>
    </div>
  )
}
