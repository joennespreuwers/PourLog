import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useSwipeClose } from '../hooks/useSwipeClose'

export default function Drawer({ open, onClose, title, children, footer }) {
  // Close on Escape — use capture phase so this fires before any bubble-phase listeners (e.g. DetailPage)
  const panelRef = useRef(null)
  useSwipeClose(panelRef, onClose, 'right', open)
  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (e.key === 'Escape') {
        // Let child components (e.g. TagInput dropdowns) claim Escape first
        if (document.querySelector('[data-traps-escape]')) return
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[70] transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(30,17,8,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full z-[71] flex flex-col"
        style={{
          width: 'min(520px, 100vw)',
          backgroundColor: 'var(--color-paper)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-8px 0 32px rgba(30,17,8,0.08)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2
            className="font-serif text-xl font-medium"
            style={{ color: 'var(--color-espresso)' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-lg transition-colors cursor-pointer"
            style={{ color: 'var(--color-stone)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-cream)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6" style={{ overscrollBehavior: 'contain' }}>
          {children}
        </div>

        {/* Optional sticky footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
