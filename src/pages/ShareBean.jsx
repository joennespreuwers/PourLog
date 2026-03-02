import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SCA_FLAT, TAG_PALETTE } from '../components/TagInput'

function normNote(note) {
  let label
  if (typeof note === 'string') {
    try { const p = JSON.parse(note); label = p?.label ?? note } catch { label = note }
  } else {
    label = note?.label ?? String(note)
  }
  const found = SCA_FLAT?.find(s => s.label === label)
  return { label, color: found?.color ?? TAG_PALETTE[11] }
}

const PROCESS_COLORS = {
  washed:                 { bg: '#dbeafe', text: '#1e3a8a' },
  'wet-hulled':           { bg: '#bfdbfe', text: '#1e40af' },
  natural:                { bg: '#fef3c7', text: '#92400e' },
  honey:                  { bg: '#fde68a', text: '#78350f' },
  'anaerobic natural':    { bg: '#f5d0fe', text: '#7e22ce' },
  'anaerobic washed':     { bg: '#e0e7ff', text: '#3730a3' },
}
const ROAST_COLORS = {
  light:    { bg: '#fef3c7', text: '#92400e' },
  medium:   { bg: '#fed7aa', text: '#9a3412' },
  dark:     { bg: '#f3e8d0', text: '#5c3d2e' },
}

function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-baseline justify-between gap-4 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
      <span className="text-xs uppercase tracking-wide shrink-0" style={{ color: 'var(--color-stone)' }}>{label}</span>
      <span className="text-sm text-right font-medium" style={{ color: 'var(--color-espresso)' }}>{value}</span>
    </div>
  )
}

export default function ShareBean() {
  const { id } = useParams()
  const [bean, setBean]         = useState(null)
  const [roastery, setRoastery] = useState(null)
  const [author, setAuthor]     = useState(null)
  const [status, setStatus]     = useState('loading')

  useEffect(() => {
    async function load() {
      const { data: b, error } = await supabase.from('beans').select('*').eq('id', id).single()
      if (error || !b) { setStatus('notfound'); return }
      setBean(b)
      if (b.roastery_id) {
        const { data: ro } = await supabase.from('roasteries').select('*').eq('id', b.roastery_id).single()
        if (ro) setRoastery(ro)
      }
      if (b.created_by) {
        const { data: profile } = await supabase.from('profiles').select('display_name, slug').eq('id', b.created_by).single()
        if (profile) setAuthor(profile)
      }
      setStatus('found')
    }
    load()
  }, [id])

  useEffect(() => {
    if (bean?.name) document.title = `${bean.name} | PourLog`
  }, [bean?.name])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-paper)' }}>
      <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Loading…</p>
    </div>
  )

  if (status === 'notfound') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--color-paper)' }}>
      <p className="font-serif text-2xl" style={{ color: 'var(--color-espresso)' }}>Bean not found</p>
      <Link to="/" className="text-sm" style={{ color: 'var(--color-roast)' }}>← Back to PourLog</Link>
    </div>
  )

  const processStyle = PROCESS_COLORS[bean.process?.toLowerCase()] ?? null
  const roastStyle = ROAST_COLORS[bean.roast_level?.toLowerCase()] ?? null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-paper)' }}>
      <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#fff' }}>
        <Link to="/" className="font-serif text-lg font-medium" style={{ color: 'var(--color-espresso)' }}>PourLog</Link>
        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-stone)' }}>shared bean</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {bean.process && processStyle && (
              <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ backgroundColor: processStyle.bg, color: processStyle.text }}>{bean.process}</span>
            )}
            {bean.roast_level && roastStyle && (
              <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ backgroundColor: roastStyle.bg, color: roastStyle.text }}>{bean.roast_level}</span>
            )}
          </div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-serif text-3xl font-medium leading-tight" style={{ color: 'var(--color-espresso)' }}>{bean.name}</h1>
          </div>
          {roastery && <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{roastery.name}{roastery.country ? ` · ${roastery.country}` : ''}</p>}
          {author && (
            <p className="text-xs" style={{ color: 'var(--color-stone)' }}>
              Added by{' '}
              {author.slug
                ? <Link to={`/u/${author.slug}`} style={{ color: 'var(--color-roast)' }}>@{author.slug}</Link>
                : <span>{author.display_name ?? 'someone'}</span>
              }
            </p>
          )}
        </div>

        {/* Flavor notes */}
        {bean.flavor_notes?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bean.flavor_notes.map((note, i) => {
              const { label, color } = normNote(note)
              return <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: color.bg, color: color.text }}>{label}</span>
            })}
          </div>
        )}

        {/* Details */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)' }}>
          <div className="px-4">
            <Row label="Origin" value={[bean.origin_country, bean.origin_region].filter(Boolean).join(', ')} />
          <Row label="Farm" value={bean.farm} />
          <Row label="Altitude" value={bean.altitude_masl ? `${bean.altitude_masl} masl` : null} />
          <Row label="Variety" value={bean.variety} />
          <Row label="Harvest" value={bean.harvest_date ? new Date(bean.harvest_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' }) : null} />
          <Row label="Roasted" value={bean.roast_date ? new Date(bean.roast_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
          <Row label="Price" value={bean.price_per_100g ? `€${Number(bean.price_per_100g).toFixed(2)} / 100g` : null} />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            to={`/app?import_bean=${bean.id}`}
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
