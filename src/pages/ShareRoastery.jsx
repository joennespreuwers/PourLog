import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ShareRoastery() {
  const { id } = useParams()
  const [roastery, setRoastery] = useState(null)
  const [author, setAuthor]     = useState(null)
  const [status, setStatus]     = useState('loading')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('roasteries').select('*').eq('id', id).single()
      if (error || !data) { setStatus('notfound'); return }
      setRoastery(data)
      document.title = `${data.name} | PourLog`
      // Fetch author profile
      if (data.created_by) {
        const { data: profile } = await supabase.from('profiles').select('display_name, slug').eq('id', data.created_by).single()
        if (profile) setAuthor(profile)
      }
      setStatus('found')
    }
    load()
  }, [id])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-paper)' }}>
      <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Loading…</p>
    </div>
  )

  if (status === 'notfound') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--color-paper)' }}>
      <p className="font-serif text-2xl" style={{ color: 'var(--color-espresso)' }}>Roastery not found</p>
      <Link to="/" className="text-sm" style={{ color: 'var(--color-roast)' }}>← Back to PourLog</Link>
    </div>
  )

  const r = roastery

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-paper)' }}>
      <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#fff' }}>
        <Link to="/" className="font-serif text-lg font-medium" style={{ color: 'var(--color-espresso)' }}>PourLog</Link>
        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-stone)' }}>shared roastery</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Photo */}
        {r.photo_url && (
          <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-medium leading-tight" style={{ color: 'var(--color-espresso)' }}>{r.name}</h1>
            {(r.city || r.country) && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-stone)' }}>{[r.city, r.country].filter(Boolean).join(', ')}</p>
            )}
            {author && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-stone)' }}>
                Added by{' '}
                {author.slug
                  ? <Link to={`/u/${author.slug}`} style={{ color: 'var(--color-roast)' }}>@{author.slug}</Link>
                  : <span>{author.display_name ?? 'someone'}</span>
                }
              </p>
            )}
          </div>
        </div>

        {r.website && (
          <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-sm break-all" style={{ color: 'var(--color-roast)' }}>{r.website}</a>
        )}

        {r.description && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-stone)' }}>About</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-espresso)' }}>{r.description}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Link
            to={`/app?import_roastery=${r.id}`}
            className="w-full py-3 rounded-xl text-sm font-medium text-center block cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}
          >
            + Add to my PourLog
          </Link>
          <Link to="/" className="text-sm text-center" style={{ color: 'var(--color-stone)' }}>
            ← Back to PourLog
          </Link>
        </div>
      </div>
    </div>
  )
}
