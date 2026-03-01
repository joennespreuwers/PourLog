import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Camera, X, Loader } from 'lucide-react'

const BUCKET = 'roastery-photos'
const MAX_DIM = 1200
const QUALITY = 0.82

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
        else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Compression failed'))
      }, 'image/jpeg', QUALITY)
    }
    img.onerror = reject
    img.src = url
  })
}

export default function ImageUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const [dragOver, setDragOver]   = useState(false)
  const inputRef                  = useRef()

  async function processFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const blob = await compressImage(file)
      const path = `${crypto.randomUUID()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      onChange(publicUrl)
    } catch (err) {
      setError(err?.message ?? 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  async function remove() {
    if (!value) return
    try {
      const parts = value.split(`/${BUCKET}/`)
      if (parts.length === 2) await supabase.storage.from(BUCKET).remove([parts[1]])
    } catch (_) {}
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium" style={{ color: 'var(--color-stone)' }}>Photo</span>

      {value ? (
        <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={remove}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full cursor-pointer"
            style={{ backgroundColor: 'rgba(30,17,8,0.65)', color: '#fff', border: 'none' }}
            title="Remove photo"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="w-full py-7 rounded-xl flex flex-col items-center gap-2 transition-colors"
          style={{
            border: `2px dashed ${dragOver ? 'var(--color-roast)' : 'var(--color-border)'}`,
            backgroundColor: dragOver ? 'var(--color-cream)' : 'var(--color-cream)',
            color: 'var(--color-stone)',
            cursor: uploading ? 'default' : 'pointer',
            opacity: uploading ? 0.7 : 1,
            outline: 'none',
          }}
        >
          {uploading ? <Loader size={18} className="animate-spin" /> : <Camera size={18} />}
          <span className="text-xs font-medium">{uploading ? 'Uploading…' : 'Click or drag & drop'}</span>
          {!uploading && <span className="text-xs" style={{ opacity: 0.6 }}>JPEG, PNG, WebP</span>}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p className="text-xs px-2 py-1.5 rounded-md" style={{ color: '#991b1b', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>{error}</p>}
    </div>
  )
}
