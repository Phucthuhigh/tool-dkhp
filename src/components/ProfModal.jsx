import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProfReviewData, getProfBadgeInfo } from '../lib/profReview.js'

export default function ProfModal({ profName, isOpen, onClose }) {
  if (!isOpen || !profName) return null

  const profInfo = getProfReviewData(profName)
  const badge = profInfo ? getProfBadgeInfo(profInfo.rating) : null

  return (
    <AnimatePresence>
      <div className="prof-modal-backdrop" onClick={onClose}>
        <motion.div
          className="prof-modal-card"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="prof-modal-close" onClick={onClose} title="Đóng modal">
            ✕
          </button>

          <div className="prof-modal-header">
            <div className="prof-avatar">👤</div>
            <div>
              <div className="prof-modal-title">{profInfo?.tenGV || profName}</div>
              <div className="prof-modal-subtitle">Giảng viên Trường ĐH Công nghệ Thông tin - UIT</div>
              {badge && (
                <div className="prof-header-badges">
                  <span className={badge.className}>{badge.scoreText}</span>
                  <span className="prof-total-count">({profInfo?.totalReviews || 0} bài đánh giá)</span>
                </div>
              )}
            </div>
          </div>

          {profInfo?.summary && (
            <div className="prof-section-box">
              <div className="prof-section-title">💬 Nhận xét tổng quan</div>
              <p className="prof-summary-text">{profInfo.summary}</p>
            </div>
          )}

          <div className="prof-reviews-container">
            <div className="prof-section-title">
              📝 Chi tiết đánh giá từ Sinh viên ({profInfo?.reviews?.length || 0})
            </div>

            {profInfo?.reviews && profInfo.reviews.length > 0 ? (
              <div className="prof-reviews-list">
                {profInfo.reviews.map((rev, index) => (
                  <div key={index} className="prof-review-card">
                    <div className="prof-review-top">
                      <span className="prof-review-stars">{'⭐'.repeat(Math.round(rev.rating || 5))} ({rev.rating}/5)</span>
                      {rev.subject && <span className="prof-review-subject">{rev.subject}</span>}
                      {rev.semester && <span className="prof-review-sem">{rev.semester}</span>}
                    </div>
                    <p className="prof-review-comment">{rev.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="prof-empty-reviews">
                Túi mù: chưa có dữ liệu bài viết đánh giá chi tiết cho giảng viên này.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
