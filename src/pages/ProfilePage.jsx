import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StarRating from '../components/StarRating'

function StatCard({ label, value }) {
  return (
    <div className="flex-1 rounded-xl p-4 text-center" style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)' }}>
      <p className="font-serif text-3xl font-medium" style={{ color: 'var(--color-espresso)' }}>{value}</p>
      <p className="text-xs uppercase tracking-wide mt-0.5" style={{ color: 'var(--color-stone)' }}>{label}</p>
    </div>
  )
}

function ItemRow({ title, subtitle, rating, tag, href }) {
  return (
    <Link to={href} className="flex items-center justify-between gap-3 py-3 group" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {tag && (
            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-stone)' }}>{tag}</span>
          )}
          <p className="text-sm font-medium truncate group-hover:underline" style={{ color: 'var(--color-espresso)' }}>{title}</p>
        </div>
        {subtitle && <p className="text-xs truncate" style={{ color: 'var(--color-stone)' }}>{subtitle}</p>}
      </div>
      {rating && <div className="shrink-0"><StarRating value={rating} /></div>}
    </Link>
  )
}

const FILTERS = ['All', 'Roasteries', 'Beans', 'Recipes']

export default function ProfilePage() {
  const { handle } = useParams()
  const [profile, setProfile]       = useState(null)
  const [roasteries, setRoasteries] = useState([])
  const [beans, setBeans]           = useState([])
  const [recipes, setRecipes]       = useState([])
  const [status, setStatus]         = useState('loading')
  const [activeFilter, setActiveFilter] = useState('All')

  useEffect(() => {
    async function load() {
      let profileData = null
      const { data: bySlug } = await supabase.from('profiles').select('*').eq('slug', handle).maybeSingle()
      if (bySlug) {
        profileData = bySlug
      } else {
        const { data: byId, error } = await supabase.from('profiles').select('*').eq('id', handle).maybeSingle()
        if (error || !byId) { setStatus('notfound'); return }
        profileData = byId
      }

      const [rRes, bRes, recRes] = await Promise.all([
        supabase.from('roasteries').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false }),
        supabase.from('beans').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false }),
        supabase.from('recipes').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false }),
      ])

      setProfile(profileData)
      setRoasteries(rRes.data ?? [])
      setBeans(bRes.data ?? [])
      setRecipes(recRes.data ?? [])
      document.title = `${profileData.display_name ?? 'Profile'} | PourLog`
      setStatus('found')
    }
    load()
  }, [handle])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-paper)' }}>
      <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Loading…</p>
    </div>
  )

  if (status === 'notfound') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--color-paper)' }}>
      <p className="font-serif text-2xl" style={{ color: 'var(--color-espresso)' }}>Profile not found</p>
      <Link to="/" className="text-sm" style={{ color: 'var(--color-roast)' }}>← Back to PourLog</Link>
    </div>
  )

  const displayName = profile?.display_name ?? 'Anonymous'

  const beanById     = Object.fromEntries(beans.map(b => [b.id, b]))
  const roasteryById = Object.fromEntries(roasteries.map(r => [r.id, r]))

  const favRoasteries = roasteries.filter(r => r.is_favorite)
  const favBeans      = beans.filter(b => b.is_favorite)
  const favRecipes    = recipes.filter(r => r.is_favorite)
  const totalFavs     = favRoasteries.length + favBeans.length + favRecipes.length

  // Build unified list for "All" view
  const allFavs = [
    ...favRoasteries.map(r => ({ type: 'Roastery', title: r.name, subtitle: [r.city, r.country].filter(Boolean).join(', '), rating: r.rating, href: `/share/roastery/${r.id}`, created_at: r.created_at })),
    ...favBeans.map(b => ({ type: 'Bean', title: b.name, subtitle: [roasteryById[b.roastery_id]?.name, b.origin_country].filter(Boolean).join(' · '), rating: b.rating, href: `/share/bean/${b.id}`, created_at: b.created_at })),
    ...favRecipes.map(r => ({ type: 'Recipe', title: r.title, subtitle: beanById[r.bean_id] ? `${beanById[r.bean_id].name}${r.brew_method ? ' · ' + r.brew_method : ''}` : (r.brew_method ?? null), rating: r.rating, href: `/share/recipe/${r.id}`, created_at: r.created_at })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const visibleItems =
    activeFilter === 'All'        ? allFavs :
    activeFilter === 'Roasteries' ? allFavs.filter(i => i.type === 'Roastery') :
    activeFilter === 'Beans'      ? allFavs.filter(i => i.type === 'Bean') :
    activeFilter === 'Recipes'    ? allFavs.filter(i => i.type === 'Recipe') :
    allFavs

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-paper)' }}>
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#fff' }}>
        <Link to="/" className="font-serif text-lg font-medium" style={{ color: 'var(--color-espresso)' }}>PourLog</Link>
        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-stone)' }}>profile</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Name */}
        <div>
          <h1 className="font-serif text-3xl font-medium" style={{ color: 'var(--color-espresso)' }}>{displayName}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-stone)' }}>Coffee journal</p>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <StatCard label="Roasteries" value={roasteries.length} />
          <StatCard label="Beans" value={beans.length} />
          <StatCard label="Recipes" value={recipes.length} />
        </div>

        {/* Favourites */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-stone)' }}>
              Favourites {totalFavs > 0 && <span style={{ color: 'var(--color-roast)' }}>({totalFavs})</span>}
            </p>
          </div>

          {/* Filter pills */}
          {totalFavs > 0 && (
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(f => {
                const count = f === 'All' ? totalFavs : f === 'Roasteries' ? favRoasteries.length : f === 'Beans' ? favBeans.length : favRecipes.length
                if (f !== 'All' && count === 0) return null
                const active = activeFilter === f
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--color-espresso)' : '#fff',
                      color: active ? 'var(--color-paper)' : 'var(--color-espresso)',
                      border: `1px solid ${active ? 'var(--color-espresso)' : 'var(--color-border)'}`,
                    }}
                  >
                    {f} {f !== 'All' && `(${count})`}
                  </button>
                )
              })}
            </div>
          )}

          {/* List */}
          {totalFavs === 0 ? (
            <p className="text-sm py-4" style={{ color: 'var(--color-stone)' }}>No favourites yet — heart items to feature them here.</p>
          ) : visibleItems.length === 0 ? (
            <p className="text-sm py-4" style={{ color: 'var(--color-stone)' }}>No {activeFilter.toLowerCase()} favourited yet.</p>
          ) : (
            <div>
              {visibleItems.map((item, i) => (
                <ItemRow key={i} title={item.title} subtitle={item.subtitle} rating={item.rating} tag={activeFilter === 'All' ? item.type : null} href={item.href} />
              ))}
            </div>
          )}
        </div>

        <Link to="/" className="text-sm text-center" style={{ color: 'var(--color-stone)' }}>
          ← Back to PourLog
        </Link>
      </div>
    </div>
  )
}
