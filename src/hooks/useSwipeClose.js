import { useEffect, useRef } from 'react'

/**
 * Attach a swipe-to-close gesture to a ref'd element.
 * @param {React.RefObject} ref       - The scrollable/swipeable container
 * @param {Function}        onClose   - Called when the swipe threshold is met
 * @param {'down'|'right'}  direction - 'down' for bottom sheets, 'right' for drawers
 * @param {boolean}         enabled   - Only attach listeners when true (i.e. when open)
 */
export function useSwipeClose(ref, onClose, direction = 'down', enabled = true) {
  const startRef = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    function onTouchStart(e) {
      const t = e.touches[0]
      startRef.current = { x: t.clientX, y: t.clientY, scrollTop: el.scrollTop ?? 0 }
    }

    function onTouchEnd(e) {
      if (!startRef.current) return
      const t = e.changedTouches[0]
      const dx = t.clientX - startRef.current.x
      const dy = t.clientY - startRef.current.y

      if (direction === 'down') {
        // Only close if: swipe is mostly downward, fast enough, AND the scroll container is at the top
        const isDownward = dy > 72 && dy > Math.abs(dx) * 1.5
        const atTop = startRef.current.scrollTop <= 0
        if (isDownward && atTop) onClose()
      } else {
        // Right: close if swipe is mostly rightward
        const isRightward = dx > 72 && dx > Math.abs(dy) * 1.5
        if (isRightward) onClose()
      }
      startRef.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [ref, onClose, direction, enabled])
}
