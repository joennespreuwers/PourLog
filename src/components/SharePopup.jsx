import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check } from 'lucide-react'

export default function SharePopup({ url, onClose }) {
  const [copied, setCopied] = useState(false)
  const overlayRef = useRef()

  // Escape key — capture phase; stop propagation so Drawer behind us doesn't also close
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Backdrop — absolute so it stays below the card in stacking order */}
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(30,17,8,0.45)' }} onClick={onClose} />
      <div
        data-traps-escape
        className="relative z-10 rounded-2xl p-6 flex flex-col items-center gap-5 w-full max-w-xs"
        style={{ backgroundColor: 'var(--color-paper)', border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(30,17,8,0.18)' }}
      >
        <div className="flex flex-col items-center gap-1 w-full">
          <p className="font-serif text-lg font-medium" style={{ color: 'var(--color-espresso)' }}>Share</p>
          <p className="text-xs text-center break-all" style={{ color: 'var(--color-stone)' }}>{url}</p>
        </div>

        {/* QR code */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)' }}>
          <QRCodeSVG
            value={url}
            size={160}
            bgColor="#ffffff"
            fgColor="#2c1810"
            level="M"
          />
        </div>

        {/* Copy button */}
        <button
          onClick={copyLink}
          className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
          style={{
            backgroundColor: copied ? '#d1fae5' : 'var(--color-espresso)',
            color: copied ? '#065f46' : 'var(--color-paper)',
            border: 'none',
          }}
        >
          {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy link</>}
        </button>

        <button
          onClick={onClose}
          className="text-xs cursor-pointer"
          style={{ color: 'var(--color-stone)' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
