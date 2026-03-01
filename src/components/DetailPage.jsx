import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft } from 'lucide-react'

export default function DetailPage({ open, onClose, title, children, footer, fullscreen = false }) {
  // Keep card mounted until exit animation finishes
  const [mounted, setMounted] = useState(open)
  // Cache content so exit animation doesn't flash an empty box
  const cacheRef = useRef({ title, children, footer })
  if (open) cacheRef.current = { title, children, footer }
  const { title: displayTitle, children: displayChildren, footer: displayFooter } = cacheRef.current

  useEffect(() => {
    if (open) {
      setMounted(true)
    } else {
      const t = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col"
        style={{
          backgroundColor: 'var(--color-paper)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* Top bar */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-medium px-2 py-1.5 rounded-md cursor-pointer"
            style={{ color: 'var(--color-stone)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-cream)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Back"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <h2 className="font-serif text-lg font-medium flex-1 truncate" style={{ color: 'var(--color-espresso)' }}>
            {title}
          </h2>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-5 py-6">
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-paper)' }}>
            <div className="mx-auto w-full max-w-2xl px-5 py-4">
              {footer}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      {mounted && (
      <div
        onClick={onClose}
        className="fixed inset-0 z-[60] transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(30,17,8,0.4)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      )}

      {/* Centered card */}
      {mounted && (
      <div
        className="fixed inset-0 z-[61] flex items-center justify-center p-4 sm:p-8"
        style={{ pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-xl flex flex-col rounded-2xl overflow-hidden"
          style={{
            maxHeight: 'min(85vh, 680px)',
            backgroundColor: 'var(--color-paper)',
            boxShadow: '0 24px 64px rgba(30,17,8,0.2)',
            opacity: open ? 1 : 0,
            transform: open ? 'translateY(0)' : 'translateY(12px)',
            transition: open
              ? 'opacity 0.18s ease, transform 0.22s cubic-bezier(0.34,1.2,0.64,1)'
              : 'opacity 0.18s ease, transform 0.18s ease',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="shrink-0 flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="font-serif text-xl font-medium truncate" style={{ color: 'var(--color-espresso)' }}>
              {displayTitle}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md text-lg cursor-pointer ml-3"
              style={{ color: 'var(--color-stone)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-cream)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {displayChildren}
          </div>

          {/* Footer */}
          {displayFooter && (
            <div
              className="shrink-0 px-5 py-4"
              style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-paper)' }}
            >
              {displayFooter}
            </div>
          )}
        </div>
      </div>
      )}
    </>
  )
}