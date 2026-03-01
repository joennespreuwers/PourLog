import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import StarRating from '../components/StarRating'
import StarPicker from '../components/StarPicker'
import Drawer from '../components/Drawer'
import DetailPage from '../components/DetailPage'
import { Input, Textarea, FieldRow, FieldSection } from '../components/FormFields'
import EmptyState from '../components/EmptyState'

const EMPTY = { name: '', country: '', city: '', website: '', description: '', rating: null, notes: '' }

export default function Roasteries({ roasteries, onAdd, onUpdate, onDelete }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const detailItem = detailId ? (roasteries.find(r => r.id === detailId) ?? null) : null

  function openAdd() { setEditing(null); setForm(EMPTY); setDrawerOpen(true) }
  function openEdit(r) {
    setEditing(r)
    setForm({ name: r.name ?? '', country: r.country ?? '', city: r.city ?? '', website: r.website ?? '', description: r.description ?? '', rating: r.rating ?? null, notes: r.notes ?? '' })
    setDrawerOpen(true)
  }
  function handleSubmit(e) {
    e.preventDefault()
    editing ? onUpdate(editing.id, form) : onAdd(form)
    setDrawerOpen(false)
  }
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1" style={{ color: 'var(--color-espresso)' }}>Roasteries</h1>
          <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{roasteries.length} {roasteries.length === 1 ? 'roastery' : 'roasteries'}</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:opacity-80" style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}>
          + Add roastery
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roasteries.map(r => (
          <RoasteryCard key={r.id} roastery={r} onView={() => setDetailId(r.id)} onEdit={() => openEdit(r)} onDelete={() => setDeleteConfirm(r.id)} />
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

      {deleteConfirm && (
        <DeleteConfirm message="Delete this roastery?" onConfirm={() => { onDelete(deleteConfirm); setDeleteConfirm(null) }} onCancel={() => setDeleteConfirm(null)} />
      )}

      <DetailPage
        open={!!detailItem}
        onClose={() => setDetailId(null)}
        title={detailItem?.name ?? ''}
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={() => openEdit(detailItem)} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}>Edit</button>
            <button type="button" onClick={() => { setDetailId(null); setDeleteConfirm(detailItem?.id) }} className="py-2 px-4 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid #fecaca', color: '#991b1b', backgroundColor: '#fff' }}>Delete</button>
          </div>
        }
      >
        {detailItem && <RoasteryDetail r={detailItem} />}
      </DetailPage>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit roastery' : 'Add roastery'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Name" required value={form.name} onChange={set('name')} placeholder="Coffee Company" />
          <FieldSection title="Location" />
          <FieldRow>
            <Input label="Country" value={form.country} onChange={set('country')} placeholder="Italy" />
            <Input label="City" value={form.city} onChange={set('city')} placeholder="Forlì" />
          </FieldRow>
          <Input label="Website" type="url" value={form.website} onChange={set('website')} placeholder="https://…" />
          <FieldSection title="About" />
          <Textarea label="Description" rows={3} value={form.description} onChange={set('description')} placeholder="What makes them special…" />
          <Textarea label="Personal notes" rows={3} value={form.notes} onChange={set('notes')} placeholder="Your impressions…" />
          <StarPicker label="Rating" value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} />
          <FormActions editing={!!editing} label="roastery" onCancel={() => setDrawerOpen(false)} />
        </form>
      </Drawer>
    </div>
  )
}

function RoasteryCard({ roastery: r, onView, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)
  return (
    <article
      className="rounded-xl p-5 flex flex-col gap-3 relative cursor-pointer"
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
      <div className="absolute top-3 right-3 flex gap-1 transition-opacity" style={{ opacity: hovered ? 1 : 0 }}>
        <ActionBtn onClick={onEdit} label="Edit"><Pencil size={13} /></ActionBtn>
        <ActionBtn onClick={onDelete} label="Delete" danger><Trash2 size={13} /></ActionBtn>
      </div>

      <div className="flex items-start justify-between">
        <span className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--color-stone)' }}>
          {[r.city, r.country].filter(Boolean).join(' · ')}
        </span>
        {r.rating && <StarRating value={r.rating} />}
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
    </article>
  )
}

function RoasteryDetail({ r }) {
  return (
    <div className="flex flex-col gap-5">
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
