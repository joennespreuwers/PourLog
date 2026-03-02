import { useState, useRef, useEffect } from 'react'
import { Pencil, Trash2, Share2, Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Drawer from '../components/Drawer'
import DetailPage from '../components/DetailPage'
import { Input, Textarea, FieldRow, FieldSection } from '../components/FormFields'
import EmptyState from '../components/EmptyState'
import SharePopup from '../components/SharePopup'
import ImageUpload from '../components/ImageUpload'

const EMPTY = { name: '', country: '', city: '', website: '', description: '', notes: '', photo_url: null }

export default function Roasteries({ user, roasteries, onAdd, onUpdate, onDelete }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const detailItem = detailId ? (roasteries.find(r => r.id === detailId) ?? null) : null
  const [shareId, setShareId] = useState(null)

  // Community search state
  const [collecting, setCollecting] = useState(null)   // globalRoasteryObj if collect-mode
  const [suggestions, setSuggestions] = useState([])
  const searchTimer = useRef(null)

  const [filterCountry, setFilterCountry] = useState('')
  const countries = [...new Set(roasteries.map(r => r.country).filter(Boolean))].sort()
  const filtered = roasteries.filter(r => !filterCountry || r.country === filterCountry)
  const isFiltering = !!filterCountry

  // Debounced community search
  useEffect(() => {
    if (collecting || !form.name || form.name.length < 2) { setSuggestions([]); return }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('roasteries')
        .select('id, name, country, city, website, description, photo_url')
        .ilike('name', `%${form.name}%`)
        .limit(6)
      const myIds = new Set(roasteries.map(r => r.id))
      setSuggestions((data ?? []).filter(s => !myIds.has(s.id)))
    }, 320)
    return () => clearTimeout(searchTimer.current)
  }, [form.name, collecting, roasteries])

  function openAdd() { setEditing(null); setCollecting(null); setSuggestions([]); setForm(EMPTY); setDrawerOpen(true) }
  function openEdit(r) {
    setEditing(r); setCollecting(null); setSuggestions([])
    setForm({ name: r.name ?? '', country: r.country ?? '', city: r.city ?? '', website: r.website ?? '', description: r.description ?? '', notes: r.notes ?? '', photo_url: r.photo_url ?? null })
    setDrawerOpen(true)
  }

  function pickSuggestion(s) {
    setCollecting(s)
    setForm({ name: s.name, country: s.country ?? '', city: s.city ?? '', website: s.website ?? '', description: s.description ?? '', notes: '', photo_url: s.photo_url ?? null })
    setSuggestions([])
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      onUpdate(editing.id, form)
    } else if (collecting) {
      onAdd({ existing_id: collecting.id, globalData: collecting, notes: form.notes })
      setCollecting(null)
    } else {
      onAdd(form)
    }
    setDrawerOpen(false)
  }

  const isCreator = editing ? editing.created_by === user?.id : true
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1" style={{ color: 'var(--color-espresso)' }}>Roasteries</h1>
          <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
            {isFiltering ? `${filtered.length} of ${roasteries.length}` : roasteries.length} {roasteries.length === 1 ? 'roastery' : 'roasteries'}
          </p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:opacity-80" style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}>
          + Add roastery
        </button>
      </div>

      {roasteries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {countries.length > 0 && (
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}>
              <option value="">All countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {isFiltering && (
            <button onClick={() => setFilterCountry('')} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-stone)', backgroundColor: '#fff' }}>Clear</button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(r => (
          <RoasteryCard key={r.id} roastery={r} user={user} onView={() => setDetailId(r.id)} onEdit={() => openEdit(r)} onDelete={() => setDeleteConfirm(r.id)} onFavorite={() => onUpdate(r.id, { is_favorite: !r.is_favorite })} />
        ))}
      </div>

      {roasteries.length === 0 && (
        <EmptyState icon="☕" title="No roasteries yet" description="Start building your library by adding the first roastery you love." action="+ Add your first roastery" onAction={openAdd} />
      )}
      {roasteries.length > 0 && filtered.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--color-stone)' }}>No roasteries match your filters.</p>
      )}

      {deleteConfirm && (
        <DeleteConfirm
          message="Remove from collection?"
          note="The roastery stays in the community library."
          onConfirm={() => { onDelete(deleteConfirm); setDeleteConfirm(null) }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <DetailPage
        open={!!detailItem}
        onClose={() => setDetailId(null)}
        title={detailItem?.name ?? ''}
        footer={
          <div className="flex gap-2">
            {detailItem?.created_by === user?.id && (
              <button type="button" onClick={() => openEdit(detailItem)} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}>Edit</button>
            )}
            <button type="button" onClick={() => setShareId(detailItem?.id)} className="py-2 px-3 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }} title="Share"><Share2 size={14} /></button>
            <button type="button" onClick={() => { setDetailId(null); setDeleteConfirm(detailItem?.id) }} className="py-2 px-4 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid #fecaca', color: '#991b1b', backgroundColor: '#fff' }}>Remove</button>
          </div>
        }
      >
        {detailItem && <RoasteryDetail r={detailItem} />}
      </DetailPage>

      {shareId && (
        <SharePopup url={`${window.location.origin}/share/roastery/${shareId}`} onClose={() => setShareId(null)} />
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit roastery' : collecting ? 'Collect roastery' : 'Add roastery'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {collecting && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#ecfdf5', border: '1px solid #86efac', color: '#166534' }}>
              Collecting <strong>{collecting.name}</strong> — add your personal notes below.
              <button type="button" onClick={() => { setCollecting(null); setSuggestions([]); setForm(EMPTY) }} className="ml-2 underline text-xs cursor-pointer" style={{ background: 'none', border: 'none', color: '#166534' }}>Cancel</button>
            </div>
          )}

          <div className="relative">
            <Input label="Name" required value={form.name} onChange={set('name')} placeholder="Coffee Company" maxLength={100} disabled={!!collecting || (editing && !isCreator)} />
            {suggestions.length > 0 && !editing && !collecting && (
              <ul className="absolute z-10 w-full mt-1 rounded-lg shadow-md overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)' }}>
                {suggestions.map(s => (
                  <li key={s.id}>
                    <button type="button" onClick={() => pickSuggestion(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between cursor-pointer" style={{ color: 'var(--color-espresso)' }}>
                      <span>{s.name}</span>
                      <span className="text-xs" style={{ color: 'var(--color-stone)' }}>{[s.city, s.country].filter(Boolean).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!collecting && (
            <>
              <FieldSection title="Location" />
              <FieldRow>
                <Input label="Country" value={form.country} onChange={set('country')} placeholder="Italy" maxLength={100} disabled={editing && !isCreator} />
                <Input label="City" value={form.city} onChange={set('city')} placeholder="Forlì" maxLength={100} disabled={editing && !isCreator} />
              </FieldRow>
              <Input label="Website" type="url" value={form.website} onChange={set('website')} placeholder="https://…" maxLength={300} disabled={editing && !isCreator} />
              <FieldSection title="About" />
              <Textarea label="Description" rows={3} value={form.description} onChange={set('description')} placeholder="What makes them special…" maxLength={500} disabled={editing && !isCreator} />
            </>
          )}

          <Textarea label="Personal notes" rows={3} value={form.notes} onChange={set('notes')} placeholder="Your impressions…" maxLength={500} />

          {!collecting && !editing && (
            <ImageUpload value={form.photo_url} onChange={url => setForm(p => ({ ...p, photo_url: url }))} />
          )}
          {editing && isCreator && (
            <ImageUpload value={form.photo_url} onChange={url => setForm(p => ({ ...p, photo_url: url }))} />
          )}

          {editing && !isCreator && (
            <p className="text-xs" style={{ color: 'var(--color-stone)' }}>You can only edit your personal notes — this roastery was created by someone else.</p>
          )}

          <FormActions editing={!!editing} collectMode={!!collecting} label="roastery" onCancel={() => setDrawerOpen(false)} />
        </form>
      </Drawer>
    </div>
  )
}

function RoasteryCard({ roastery: r, user, onView, onEdit, onDelete, onFavorite }) {
  const [hovered, setHovered] = useState(false)
  const isCreator = r.created_by === user?.id
  return (
    <article
      className="rounded-xl flex flex-col relative cursor-pointer overflow-hidden"
      style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)', boxShadow: hovered ? '0 4px 16px rgba(30,17,8,0.08)' : '0 1px 4px rgba(30,17,8,0.04)', transition: 'box-shadow 0.15s' }}
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {r.photo_url && (
        <div className="w-full" style={{ aspectRatio: '16/7', overflow: 'hidden' }}>
          <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5 flex flex-col gap-3">
        <div className="card-actions absolute top-3 right-3 flex gap-1 transition-opacity" style={{ opacity: hovered ? 1 : 0 }}>
          {isCreator && <ActionBtn onClick={onEdit} label="Edit"><Pencil size={13} /></ActionBtn>}
          <ActionBtn onClick={onDelete} label="Remove" danger><Trash2 size={13} /></ActionBtn>
        </div>
        <button onClick={e => { e.stopPropagation(); onFavorite() }} className="absolute bottom-2 right-2 cursor-pointer" title={r.is_favorite ? 'Unfavourite' : 'Favourite'} style={{ background: 'none', border: 'none', padding: 8, opacity: r.is_favorite || hovered ? 1 : 0.3, transition: 'opacity 0.15s' }}>
          <Heart size={14} fill={r.is_favorite ? 'currentColor' : 'none'} style={{ color: r.is_favorite ? '#b91c1c' : 'var(--color-stone)' }} />
        </button>

        <div className="flex items-start justify-between pr-20">
          <span className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--color-stone)' }}>
            {[r.city, r.country].filter(Boolean).join(' · ')}
          </span>
        </div>

        <div>
          <h2 className="font-serif text-xl font-medium leading-tight" style={{ color: 'var(--color-espresso)' }}>{r.name}</h2>
          {r.website && (
            <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-xs mt-0.5 inline-block truncate max-w-full" style={{ color: 'var(--color-stone)' }} onClick={e => e.stopPropagation()}>
              {r.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {r.description && (
          <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--color-roast)', opacity: 0.85 }}>{r.description}</p>
        )}
        {r.notes && (
          <p className="text-xs italic leading-relaxed border-t pt-3 line-clamp-2" style={{ color: 'var(--color-stone)', borderColor: 'var(--color-border)' }}>"{r.notes}"</p>
        )}
      </div>
    </article>
  )
}

function RoasteryDetail({ r }) {
  return (
    <div className="flex flex-col gap-5">
      {r.photo_url && (
        <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" />
        </div>
      )}
      {(r.city || r.country) && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-stone)' }}>Location</p>
          <p className="text-sm" style={{ color: 'var(--color-espresso)' }}>{[r.city, r.country].filter(Boolean).join(', ')}</p>
        </div>
      )}
      {r.website && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-stone)' }}>Website</p>
          <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-sm break-all" style={{ color: 'var(--color-roast)' }}>{r.website}</a>
        </div>
      )}
      {r.description && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-stone)' }}>About</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-espresso)' }}>{r.description}</p>
        </div>
      )}
      {r.notes && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-stone)' }}>My notes</p>
          <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-roast)' }}>"{r.notes}"</p>
        </div>
      )}
    </div>
  )
}

export function ActionBtn({ onClick, label, danger, children }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      className="w-10 h-10 flex items-center justify-center rounded text-xs cursor-pointer"
      style={{ border: '1px solid var(--color-border)', backgroundColor: hov ? (danger ? '#fee2e2' : 'var(--color-cream)') : '#fff', color: hov && danger ? '#991b1b' : 'var(--color-stone)', transition: 'all 0.1s' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      aria-label={label}
    >{children}</button>
  )
}

export function DeleteConfirm({ message, note, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0" style={{ backgroundColor: 'rgba(30,17,8,0.35)' }} onClick={onCancel} />
      <div className="relative rounded-xl p-6 flex flex-col gap-4 w-full max-w-xs" style={{ backgroundColor: 'var(--color-paper)', border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(30,17,8,0.12)' }}>
        <p className="font-medium text-center" style={{ color: 'var(--color-espresso)' }}>{message}</p>
        {note
          ? <p className="text-xs text-center" style={{ color: 'var(--color-stone)' }}>{note}</p>
          : <p className="text-xs text-center" style={{ color: 'var(--color-stone)' }}>This cannot be undone.</p>
        }
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}>Cancel</button>
          <button type="button" onClick={onConfirm} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ backgroundColor: '#991b1b', color: '#fff' }}>Remove</button>
        </div>
      </div>
    </div>
  )
}

export function FormActions({ editing, collectMode, label, onCancel }) {
  const submitLabel = editing ? 'Save changes' : collectMode ? 'Collect' : `Add ${label}`
  return (
    <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}>Cancel</button>
      <button type="submit" className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}>{submitLabel}</button>
    </div>
  )
}

