import { useState, useRef } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Drawer from '../components/Drawer'
import { Input, Textarea, Select } from '../components/FormFields'
import { ActionBtn, DeleteConfirm, FormActions } from './Roasteries'
import { TAG_PALETTE } from '../components/TagInput'

const CATEGORIES = [
  { key: 'brewer', label: 'Brewers', description: 'Drippers, espresso machines, immersion brewers' },
  { key: 'grinder', label: 'Grinders', description: 'Hand & electric grinders' },
  { key: 'filter_paper', label: 'Filter Papers', description: 'Paper, cloth and specialty filters' },
]

const EMPTY = { name: '', brand: '', category: '', notes: '', color: null }

export default function Equipment({ equipment, onAdd, onUpdate, onDelete, onExport, onImport }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerCategory, setDrawerCategory] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [importError, setImportError] = useState(null)
  const [importConfirm, setImportConfirm] = useState(null)
  const fileInputRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result)
        if (!data.roasteries && !data.beans && !data.recipes && !data.equipment) {
          setImportError('Not a valid PourLog export file.')
          return
        }
        setImportConfirm(data)
      } catch {
        setImportError('Could not parse file — make sure it\'s a PourLog JSON export.')
      }
    }
    reader.readAsText(file)
  }

  function confirmImport() {
    onImport(importConfirm)
    setImportConfirm(null)
  }

  function openAdd(category) {
    setEditing(null)
    setDrawerCategory(category)
    setForm({ ...EMPTY, category })
    setDrawerOpen(true)
  }
  function openEdit(item) {
    setEditing(item)
    setDrawerCategory(item.category)
    setForm({ name: item.name ?? '', brand: item.brand ?? '', category: item.category ?? '', notes: item.notes ?? '', color: item.color ?? null })
    setDrawerOpen(true)
  }
  function handleSubmit(e) {
    e.preventDefault()
    editing ? onUpdate(editing.id, form) : onAdd(form)
    setDrawerOpen(false)
  }
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const drawerTitle = editing
    ? `Edit ${CATEGORIES.find(c => c.key === drawerCategory)?.label.slice(0, -1).toLowerCase() ?? 'item'}`
    : `Add ${CATEGORIES.find(c => c.key === drawerCategory)?.label.slice(0, -1).toLowerCase() ?? 'item'}`

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium mb-1" style={{ color: 'var(--color-espresso)' }}>Equipment</h1>
        <p className="text-sm" style={{ color: 'var(--color-stone)' }}>Brewers, grinders and filter papers</p>
      </div>

      <div className="flex flex-col gap-10">
        {CATEGORIES.map(cat => {
          const items = equipment.filter(e => e.category === cat.key)
          return (
            <section key={cat.key}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-serif text-xl font-medium" style={{ color: 'var(--color-espresso)' }}>{cat.label}</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>
                    <span className="block sm:inline">{cat.description}</span>
                    <span className="sm:before:content-['·'] sm:before:mx-1">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                  </p>
                </div>
                <button
                  onClick={() => openAdd(cat.key)}
                  className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:opacity-80"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}
                >
                  + Add
                </button>
              </div>

              {items.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ border: '1px dashed var(--color-border)', backgroundColor: 'var(--color-cream)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-stone)' }}>No {cat.label.toLowerCase()} yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(item => (
                    <EquipmentCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => setDeleteConfirm(item.id)} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {deleteConfirm && (
        <DeleteConfirm
          message="Delete this item?"
          onConfirm={() => { onDelete(deleteConfirm); setDeleteConfirm(null) }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {importConfirm && (
        <DeleteConfirm
          message={`Replace all your data with this export? (${importConfirm.roasteries?.length ?? 0} roasteries, ${importConfirm.beans?.length ?? 0} beans, ${importConfirm.recipes?.length ?? 0} recipes)`}
          onConfirm={confirmImport}
          onCancel={() => setImportConfirm(null)}
        />
      )}

      {importError && (
        <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-3 rounded-xl text-sm font-medium shadow-xl" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
          {importError}
          <button onClick={() => setImportError(null)} className="ml-3 underline cursor-pointer">dismiss</button>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerTitle}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Name" required value={form.name} onChange={set('name')} placeholder="e.g. Comandante C40 MK4" />
          <Input label="Brand" value={form.brand} onChange={set('brand')} placeholder="e.g. Comandante" />
          <Select label="Category" value={form.category} onChange={set('category')} required>
            <option value="">—</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label.slice(0, -1)}</option>)}
          </Select>
          <Textarea label="Notes" rows={3} value={form.notes} onChange={set('notes')} placeholder="Any relevant details…" />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-stone)' }}>Tag color</span>
            <div className="flex gap-1.5 flex-wrap items-center">
              <button type="button" onClick={() => setForm(p => ({ ...p, color: null }))}
                className="h-7 w-7 rounded text-xs font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-stone)', border: `2px solid ${form.color === null ? 'var(--color-espresso)' : 'transparent'}` }}
                title="Auto (based on name)">A</button>
              {TAG_PALETTE.map((c, i) => (
                <button key={i} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                  className="h-7 w-7 rounded cursor-pointer"
                  style={{ backgroundColor: c.bg, border: `2px solid ${form.color?.bg === c.bg ? c.text : 'transparent'}` }}
                />
              ))}
            </div>
          </div>
          <FormActions editing={!!editing} label="item" onCancel={() => setDrawerOpen(false)} />
        </form>
      </Drawer>

      {/* Data section */}
      <section className="mt-16 pt-10" style={{ borderTop: '1px solid var(--color-border)' }}>
        <h2 className="font-serif text-xl font-medium mb-1" style={{ color: 'var(--color-espresso)' }}>Data</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-stone)' }}>Export your library as JSON, or import a previous backup.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onExport}
            className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:opacity-80"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}
          >
            ↓ Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:opacity-80"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}
          >
            ↑ Import JSON
          </button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--color-stone)' }}>Your data is stored locally in this browser. Exporting regularly is a good way to back it up.</p>
      </section>
    </div>
  )
}

function EquipmentCard({ item, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden"
      style={{
        backgroundColor: '#fff',
        border: '1px solid var(--color-border)',
        boxShadow: hovered ? '0 4px 16px rgba(30,17,8,0.08)' : '0 1px 4px rgba(30,17,8,0.04)',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {item.color && (
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: item.color.bg, borderBottom: `1px solid ${item.color.text}22` }} />
      )}
      <div className="card-actions absolute top-3 right-3 flex gap-1 transition-opacity" style={{ opacity: hovered ? 1 : 0 }}>
        <ActionBtn onClick={onEdit} label="Edit"><Pencil size={13} /></ActionBtn>
        <ActionBtn onClick={onDelete} label="Delete" danger><Trash2 size={13} /></ActionBtn>
      </div>

      <div className="flex items-center gap-2 pr-14">
        <div>
          <h3 className="font-medium text-sm leading-tight" style={{ color: 'var(--color-espresso)' }}>{item.name}</h3>
          {item.brand && <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>{item.brand}</p>}
        </div>
      </div>

      {item.notes && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--color-stone)' }}>{item.notes}</p>
      )}
    </div>
  )
}
