import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StarRating from '../components/StarRating'

function formatTime(secs) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
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

export default function ShareRecipe() {
  const { id } = useParams()
  const [recipe, setRecipe]   = useState(null)
  const [bean, setBean]       = useState(null)
  const [roastery, setRoastery] = useState(null)
  const [status, setStatus]   = useState('loading') // loading | found | notfound

  useEffect(() => {
    async function load() {
      const { data: r, error } = await supabase.from('recipes').select('*').eq('id', id).single()
      if (error || !r) { setStatus('notfound'); return }
      setRecipe(r)

      if (r.bean_id) {
        const { data: b } = await supabase.from('beans').select('*').eq('id', r.bean_id).single()
        if (b) {
          setBean(b)
          if (b.roastery_id) {
            const { data: ro } = await supabase.from('roasteries').select('*').eq('id', b.roastery_id).single()
            if (ro) setRoastery(ro)
          }
        }
      }
      setStatus('found')
    }
    load()
  }, [id])

  useEffect(() => {
    if (recipe?.title) document.title = `${recipe.title} | PourLog`
  }, [recipe?.title])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-paper)' }}>
      <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Loading…</p>
    </div>
  )

  if (status === 'notfound') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--color-paper)' }}>
      <p className="font-serif text-2xl" style={{ color: 'var(--color-espresso)' }}>Recipe not found</p>
      <Link to="/" className="text-sm" style={{ color: 'var(--color-roast)' }}>← Back to PourLog</Link>
    </div>
  )

  const ratio = recipe.dose_g && recipe.yield_g
    ? `1 : ${(recipe.yield_g / recipe.dose_g).toFixed(1)}`
    : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-paper)' }}>
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#fff' }}>
        <Link to="/" className="font-serif text-lg font-medium" style={{ color: 'var(--color-espresso)' }}>PourLog</Link>
        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-stone)' }}>shared recipe</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Title + rating */}
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-serif text-3xl font-medium leading-tight" style={{ color: 'var(--color-espresso)' }}>{recipe.title}</h1>
          {recipe.rating && <div className="shrink-0 pt-1"><StarRating value={recipe.rating} /></div>}
        </div>

        {/* Bean / roastery */}
        {bean && (
          <div className="rounded-xl p-4 flex flex-col gap-1" style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-stone)' }}>Bean</p>
            <p className="font-medium" style={{ color: 'var(--color-espresso)' }}>{bean.name}</p>
            {roastery && <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{roastery.name}{roastery.country ? ` · ${roastery.country}` : ''}</p>}
            {bean.process && <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>{bean.process}{bean.roast_level ? ` · ${bean.roast_level}` : ''}</p>}
          </div>
        )}

        {/* Parameters */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)' }}>
          <div className="px-4">
            <Row label="Brew method" value={recipe.brew_method} />
            <Row label="Filter" value={recipe.filter_type} />
            <Row label="Dose" value={recipe.dose_g ? `${recipe.dose_g} g` : null} />
            <Row label="Yield" value={recipe.yield_g ? `${recipe.yield_g} g` : null} />
            <Row label="Ratio" value={ratio} />
            <Row label="Water temp" value={recipe.water_temp_c ? `${recipe.water_temp_c} °C` : null} />
            <Row label="Grind" value={recipe.grind_size} />
            <Row label="Brew time" value={formatTime(recipe.brew_time_sec)} />
          </div>
        </div>

        {/* Steps */}
        {recipe.steps && (
          <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-stone)' }}>Steps</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-espresso)' }}>{recipe.steps}</p>
          </div>
        )}

        {/* Notes */}
        {recipe.notes && (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-stone)' }}>Notes</p>
            <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-roast)' }}>"{recipe.notes}"</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <Link
            to={`/app?copy_recipe=${id}`}
            className="w-full py-3 rounded-xl text-sm font-medium text-center block cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}
          >
            Copy this technique to my PourLog
          </Link>
          <Link to="/" className="text-sm text-center" style={{ color: 'var(--color-stone)' }}>
            ← Back to PourLog
          </Link>
        </div>
      </div>
    </div>
  )
}
