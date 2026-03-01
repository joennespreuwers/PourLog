import { useState } from 'react'
import { Pencil, Trash2, Share2, Heart, Copy } from 'lucide-react'
import StarRating from '../components/StarRating'
import StarPicker from '../components/StarPicker'
import Drawer from '../components/Drawer'
import DetailPage from '../components/DetailPage'
import { Input, Textarea, FieldRow, FieldSection } from '../components/FormFields'
import EmptyState from '../components/EmptyState'
import SharePopup from '../components/SharePopup'
import ImageUpload from '../components/ImageUpload'

const EMPTY = { name: '', country: '', city: '', website: '', description: '', rating: null, notes: '', photo_url: null }

export default function Roasteries({ roasteries, onAdd, onUpdate, onDelete }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [cloningImportedId, setCloningImportedId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const detailItem = detailId ? (roasteries.find(r => r.id === detailId) ?? null) : null
  const [shareId, setShareId] = useState(null)

  const [filterCountry, setFilterCountry] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const countries = [...new Set(roasteries.map(r => r.country).filter(Boolean))].sort()
  const filtered = roasteries.filter(r => {
    if (filterCountry && r.country !== filterCountry) return false
    if (filterRating && (r.rating ?? 0) < Number(filterRating)) return false
    return true
  })
  const isFiltering = filterCountry || filterRating

  function openAdd() { setEditing(null); setForm(EMPTY); setDrawerOpen(true) }
  function openEdit(r) {
    setEditing(r)
    setForm({ name: r.name ?? '', country: r.country ?? '', city: r.city ?? '', website: r.website ?? '', description: r.description ?? '', rating: r.rating ?? null, notes: r.notes ?? '', photo_url: r.photo_url ?? null })
    setDrawerOpen(true)
  }
  function openClone(r) {
    setEditing(null)
    setCloningImportedId(r.imported ? r.id : null)
    setForm({ name: r.name ?? '', country: r.country ?? '', city: r.city ?? '', website: r.website ?? '', description: r.description ?? '', rating: r.rating ?? null, notes: r.notes ?? '', photo_url: r.photo_url ?? null })
    setDrawerOpen(true)
  }
  function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      onUpdate(editing.id, form)
    } else {
      onAdd(cloningImportedId ? { ...form, origin_id: cloningImportedId } : form)
      if (cloningImportedId) { onDelete(cloningImportedId); setCloningImportedId(null) }
    }
    setDrawerOpen(false)
  }
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
          <select value={filterRating} onChange={e => setFilterRating(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}>
            <option value="">Any rating</option>
            {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}★ and up</option>)}
          </select>
          {isFiltering && (
            <button onClick={() => { setFilterCountry(''); setFilterRating('') }} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-stone)', backgroundColor: '#fff' }}>Clear</button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(r => (
          <RoasteryCard key={r.id} roastery={r} onView={() => setDetailId(r.id)} onEdit={() => openEdit(r)} onDelete={() => setDeleteConfirm(r.id)} onFavorite={() => onUpdate(r.id, { is_favorite: !r.is_favorite })} onClone={() => openClone(r)} />
        ))}
      </div>

      {roasteries.length === 0 && (
        <EmptyState
          icon="☕"
          title="No roasteries yet"
          description="Start building your library by adding the first roastery you love."
          action="+ Add your first roastery"
          onAction={openAdd}
        />
      )}
      {roasteries.length > 0 && filtered.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--color-stone)' }}>No roasteries match your filters.</p>
      )}

      {deleteConfirm && (
        <DeleteConfirm message="Delete this roastery?" onConfirm={() => { onDelete(deleteConfirm); setDeleteConfirm(null) }} onCancel={() => setDeleteConfirm(null)} />
      )}

      <DetailPage
        open={!!detailItem}
        onClose={() => setDetailId(null)}
        title={detailItem?.name ?? ''}
        footer={
          <div className="flex gap-2">
            {detailItem?.imported ? (
              <>
                <button type="button" onClick={() => { setDetailId(null); openClone(detailItem) }} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center justify-center gap-1.5" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}><Copy size={13} /> Clone</button>
                <button type="button" onClick={() => setShareId(detailItem?.id)} className="py-2 px-3 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }} title="Share"><Share2 size={14} /></button>
                <button type="button" onClick={() => { setDetailId(null); setDeleteConfirm(detailItem?.id) }} className="py-2 px-4 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid #fecaca', color: '#991b1b', backgroundColor: '#fff' }}>Delete</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => openEdit(detailItem)} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}>Edit</button>
                <button type="button" onClick={() => setShareId(detailItem?.id)} className="py-2 px-3 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }} title="Share"><Share2 size={14} /></button>
                <button type="button" onClick={() => { setDetailId(null); setDeleteConfirm(detailItem?.id) }} className="py-2 px-4 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid #fecaca', color: '#991b1b', backgroundColor: '#fff' }}>Delete</button>
              </>
            )}
          </div>
        }
      >
        {detailItem && <RoasteryDetail r={detailItem} />}
      </DetailPage>

      {shareId && (
        <SharePopup
          url={`${window.location.origin}/share/roastery/${shareId}`}
          onClose={() => setShareId(null)}
        />
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit roastery' : 'Add roastery'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Name" required value={form.name} onChange={set('name')} placeholder="Coffee Company" maxLength={100} />
          <FieldSection title="Location" />
          <FieldRow>
            <Input label="Country" value={form.country} onChange={set('country')} placeholder="Italy" maxLength={100} />
            <Input label="City" value={form.city} onChange={set('city')} placeholder="Forlì" maxLength={100} />
          </FieldRow>
          <Input label="Website" type="url" value={form.website} onChange={set('website')} placeholder="https://…" maxLength={300} />
          <FieldSection title="About" />
          <Textarea label="Description" rows={3} value={form.description} onChange={set('description')} placeholder="What makes them special…" maxLength={500} />
          <Textarea label="Personal notes" rows={3} value={form.notes} onChange={set('notes')} placeholder="Your impressions…" maxLength={500} />
          <ImageUpload value={form.photo_url} onChange={url => setForm(p => ({ ...p, photo_url: url }))} />
          <StarPicker label="Rating" value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} />
          <FormActions editing={!!editing} label="roastery" onCancel={() => setDrawerOpen(false)} />
        </form>
      </Drawer>
    </div>
  )
}

function RoasteryCard({ roastery: r, onView, onEdit, onDelete, onFavorite, onClone }) {
  const [hovered, setHovered] = useState(false)
  return (
    <article
      className="rounded-xl flex flex-col relative cursor-pointer overflow-hidden"
      style={{
        backgroundColor: '#fff',
        border: '1px solid var(--color-border)',
        boxShadow: hovered ? '0 4px 16px rgba(30,17,8,0.08)' : '0 1px 4px rgba(30,17,8,0.04)',
        transition: 'box-shadow 0.15s',
      }}
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Photo banner */}
      {r.photo_url && (
        <div className="w-full" style={{ aspectRatio: '16/7', overflow: 'hidden' }}>
          <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5 flex flex-col gap-3">
      <div className="absolute top-3 right-3 flex gap-1 transition-opacity" style={{ opacity: hovered ? 1 : 0 }}>
        {r.imported ? (
          <>
            <ActionBtn onClick={onClone} label="Clone"><Copy size={13} /></ActionBtn>
            <ActionBtn onClick={onDelete} label="Delete" danger><Trash2 size={13} /></ActionBtn>
          </>
        ) : (
          <>
            <ActionBtn onClick={onEdit} label="Edit"><Pencil size={13} /></ActionBtn>
            <ActionBtn onClick={onDelete} label="Delete" danger><Trash2 size={13} /></ActionBtn>
          </>
        )}
      </div>
      <button onClick={e => { e.stopPropagation(); onFavorite() }} className="absolute bottom-3 right-3 cursor-pointer" title={r.is_favorite ? 'Unfavourite' : 'Favourite'} style={{ background: 'none', border: 'none', padding: 0, opacity: r.is_favorite || hovered ? 1 : 0.3, transition: 'opacity 0.15s' }}>
        <Heart size={14} fill={r.is_favorite ? 'currentColor' : 'none'} style={{ color: r.is_favorite ? '#b91c1c' : 'var(--color-stone)' }} />
      </button>

      <div className="flex items-start justify-between">
        <span className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--color-stone)' }}>
          {[r.city, r.country].filter(Boolean).join(' · ')}
        </span>
        <div className="flex items-center gap-1.5">
          {r.imported && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}>Cloned</span>}
          {r.rating && <StarRating value={r.rating} />}
        </div>
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
      {r.rating && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-stone)' }}>Rating</p>
          <StarRating value={r.rating} />
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
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-stone)' }}>Notes</p>
          <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-roast)' }}>"{r.notes}"</p>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ onClick, label, danger, children }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      className="w-7 h-7 flex items-center justify-center rounded text-xs cursor-pointer"
      style={{ border: '1px solid var(--color-border)', backgroundColor: hov ? (danger ? '#fee2e2' : 'var(--color-cream)') : '#fff', color: hov && danger ? '#991b1b' : 'var(--color-stone)', transition: 'all 0.1s' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      aria-label={label}
    >{children}</button>
  )
}

function DeleteConfirm({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0" style={{ backgroundColor: 'rgba(30,17,8,0.35)' }} onClick={onCancel} />
      <div className="relative rounded-xl p-6 flex flex-col gap-4 w-full max-w-xs" style={{ backgroundColor: 'var(--color-paper)', border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(30,17,8,0.12)' }}>
        <p className="font-medium text-center" style={{ color: 'var(--color-espresso)' }}>{message}</p>
        <p className="text-xs text-center" style={{ color: 'var(--color-stone)' }}>This cannot be undone.</p>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}>Cancel</button>
          <button type="button" onClick={onConfirm} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ backgroundColor: '#991b1b', color: '#fff' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function FormActions({ editing, label, onCancel }) {
  return (
    <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}>Cancel</button>
      <button type="submit" className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}>{editing ? 'Save changes' : `Add ${label}`}</button>
    </div>
  )
}

export { ActionBtn, DeleteConfirm, FormActions }
