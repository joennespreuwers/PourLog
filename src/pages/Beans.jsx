import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import StarRating from '../components/StarRating'
import StarPicker from '../components/StarPicker'
import Drawer from '../components/Drawer'
import DetailPage from '../components/DetailPage'
import TagInput from '../components/TagInput'
import { Input, Textarea, Select, FieldRow, FieldSection } from '../components/FormFields'
import EmptyState from '../components/EmptyState'
import { ActionBtn, DeleteConfirm, FormActions } from './Roasteries'

const PROCESS_COLORS = {
  // Water-based / clean
  washed:                 { bg: '#dbeafe', text: '#1e3a8a' }, // clear blue = water / clean
  'wet-hulled':           { bg: '#bfdbfe', text: '#1e40af' }, // deeper blue = wet earthy
  // Sun-dried / fruit-forward
  natural:                { bg: '#fef3c7', text: '#92400e' }, // warm amber = sun-dried
  // Honey (mucilage levels)
  honey:                  { bg: '#fde68a', text: '#78350f' }, // real honey gold
  'yellow honey':         { bg: '#fef9c3', text: '#854d0e' }, // pale yellow, least mucilage
  'red honey':            { bg: '#fecaca', text: '#991b1b' }, // warm red, medium mucilage
  'black honey':          { bg: '#4c1d95', text: '#ede9fe' }, // dark/inverted, most mucilage
  // Anaerobic / fermentation
  'anaerobic natural':    { bg: '#f5d0fe', text: '#7e22ce' }, // vivid purple = funky & fruity
  'anaerobic washed':     { bg: '#e0e7ff', text: '#3730a3' }, // indigo = fermented but clean
  'carbonic maceration':  { bg: '#fecdd3', text: '#9f1239' }, // wine-red = carbonic (wine term)
  'extended fermentation':{ bg: '#ffedd5', text: '#9a3412' }, // warm orange = long & slow heat
  'double fermented':     { bg: '#ede9fe', text: '#5b21b6' }, // deep violet = twice fermented
  'lactic fermentation':  { bg: '#d1fae5', text: '#065f46' }, // soft mint = creamy lactic
  'koji fermentation':    { bg: '#fce7f3', text: '#9d174d' }, // sakura pink = Japanese koji
  'wine process':         { bg: '#fce7e7', text: '#7f1d1d' }, // burgundy = wine barrels
  'thermal shock':        { bg: '#e0f2fe', text: '#0c4a6e' }, // icy blue = temperature shock
}
const ROAST_COLORS = {
  'ultra light':   { bg: '#fef9c3', text: '#713f12' },
  light:           { bg: '#fef3c7', text: '#92400e' },
  'light-medium':  { bg: '#ffedd5', text: '#9a3412' },
  medium:          { bg: '#fed7aa', text: '#9a3412' },
  'medium-dark':   { bg: '#fcd9bd', text: '#7c2d12' },
  dark:            { bg: '#f3e8d0', text: '#5c3d2e' },
  'very dark':     { bg: '#e7d5c0', text: '#3b1a0a' },
}

const EMPTY = {
  name: '', roastery_id: '', origin_country: '', origin_region: '', farm: '',
  variety: '', process: '', roast_level: '', altitude_masl: '', harvest_date: '',
  roast_date: '', flavor_notes: [], price_per_100g: '', rating: null, notes: '',
}

export default function Beans({ beans, roasteries, onAdd, onUpdate, onDelete }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const detailItem = detailId ? (beans.find(b => b.id === detailId) ?? null) : null

  const roasteryById = Object.fromEntries(roasteries.map(r => [r.id, r]))

  function openAdd() { setEditing(null); setForm(EMPTY); setDrawerOpen(true) }
  function openEdit(b) {
    setEditing(b)
    setForm({
      name: b.name ?? '', roastery_id: b.roastery_id ?? '', origin_country: b.origin_country ?? '',
      origin_region: b.origin_region ?? '', farm: b.farm ?? '', variety: b.variety ?? '',
      process: b.process ?? '', roast_level: b.roast_level ?? '', altitude_masl: b.altitude_masl ?? '',
      harvest_date: b.harvest_date ?? '', roast_date: b.roast_date ?? '',
      flavor_notes: b.flavor_notes ?? [], price_per_100g: b.price_per_100g ?? '',
      rating: b.rating ?? null, notes: b.notes ?? '',
    })
    setDrawerOpen(true)
  }
  function handleSubmit(e) {
    e.preventDefault()
    const data = {
      ...form,
      altitude_masl:   form.altitude_masl   ? Number(form.altitude_masl)   : null,
      price_per_100g:  form.price_per_100g  ? Number(form.price_per_100g)  : null,
      harvest_date:    form.harvest_date    || null,
      roast_date:      form.roast_date      || null,
      roastery_id:     form.roastery_id     || null,
    }
    editing ? onUpdate(editing.id, data) : onAdd(data)
    setDrawerOpen(false)
  }
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1" style={{ color: 'var(--color-espresso)' }}>Beans</h1>
          <p className="text-sm" style={{ color: 'var(--color-stone)' }}>{beans.length} {beans.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:opacity-80" style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}>
          + Add bean
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {beans.map(b => (
          <BeanCard key={b.id} bean={b} roasteryById={roasteryById} onView={() => setDetailId(b.id)} onEdit={() => openEdit(b)} onDelete={() => setDeleteConfirm(b.id)} />
        ))}
      </div>

      {beans.length === 0 && (
        <EmptyState
          icon="🫘"
          title="No beans logged yet"
          description="Track what's on your shelf — origin, process, roast level and tasting notes."
          action="+ Add your first bean"
          onAction={openAdd}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirm message="Delete this bean?" onConfirm={() => { onDelete(deleteConfirm); setDeleteConfirm(null) }} onCancel={() => setDeleteConfirm(null)} />
      )}

      {/* Detail page */}
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
        {detailItem && <BeanDetail b={detailItem} roasteryById={roasteryById} />}
      </DetailPage>

      {/* Edit / Add drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit bean' : 'Add bean'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Name" required value={form.name} onChange={set('name')} placeholder="Timor-Timu Natural" />

          <Select label="Roastery" value={form.roastery_id} onChange={set('roastery_id')}>
            <option value="">— None —</option>
            {roasteries.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>

          <FieldSection title="Origin" />
          <FieldRow>
            <Input label="Country" value={form.origin_country} onChange={set('origin_country')} placeholder="Ethiopia" />
            <Input label="Region" value={form.origin_region} onChange={set('origin_region')} placeholder="Yirgacheffe" />
          </FieldRow>
          <FieldRow>
            <Input label="Farm / Cooperative" value={form.farm} onChange={set('farm')} placeholder="Worka Cooperative" />
            <Input label="Altitude (masl)" type="number" value={form.altitude_masl} onChange={set('altitude_masl')} placeholder="1900" />
          </FieldRow>

          <FieldSection title="Coffee" />
          <FieldRow>
            <Input label="Variety" value={form.variety} onChange={set('variety')} placeholder="Heirloom, Gesha…" />
            <Select label="Process" value={form.process} onChange={set('process')}>
              <option value="">—</option>
              {['washed', 'natural', 'honey', 'yellow honey', 'red honey', 'black honey',
                'anaerobic natural', 'anaerobic washed', 'wet-hulled', 'carbonic maceration',
                'extended fermentation', 'double fermented', 'lactic fermentation',
                'koji fermentation', 'wine process', 'thermal shock',
              ].map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </FieldRow>
          <FieldRow>
            <Select label="Roast level" value={form.roast_level} onChange={set('roast_level')}>
              <option value="">—</option>
              {['ultra light', 'light', 'light-medium', 'medium', 'medium-dark', 'dark', 'very dark'].map(l => <option key={l} value={l}>{l}</option>)}
            </Select>
            <Input label="Price / 100g (€)" type="number" step="0.01" value={form.price_per_100g} onChange={set('price_per_100g')} placeholder="4.80" />
          </FieldRow>

          <FieldSection title="Dates" />
          <FieldRow>
            <Input label="Harvest date" type="date" value={form.harvest_date} onChange={set('harvest_date')} />
            <Input label="Roast date" type="date" value={form.roast_date} onChange={set('roast_date')} />
          </FieldRow>

          <TagInput label="Flavor notes" value={form.flavor_notes} onChange={v => setForm(p => ({ ...p, flavor_notes: v }))} />
          <Textarea label="Personal notes" rows={3} value={form.notes} onChange={set('notes')} placeholder="Your tasting impressions…" />
          <StarPicker label="Rating" value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} />
          <FormActions editing={!!editing} label="bean" onCancel={() => setDrawerOpen(false)} />
        </form>
      </Drawer>
    </div>
  )
}

function BeanDetail({ b, roasteryById }) {
  const roastery = roasteryById[b.roastery_id]
  const processStyle = PROCESS_COLORS[b.process?.toLowerCase()] ?? null
  const roastStyle = ROAST_COLORS[b.roast_level?.toLowerCase()] ?? null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {b.process && processStyle && <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ backgroundColor: processStyle.bg, color: processStyle.text }}>{b.process}</span>}
          {b.roast_level && roastStyle && <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ backgroundColor: roastStyle.bg, color: roastStyle.text }}>{b.roast_level}</span>}
        </div>
        {b.rating && <StarRating value={b.rating} />}
      </div>

      {b.flavor_notes?.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-stone)' }}>Flavor notes</p>
          <div className="flex flex-wrap gap-1.5">
            {b.flavor_notes.map((note, i) => {
              const label = typeof note === 'string' ? note : note.label
              const bg = typeof note === 'string' ? 'var(--color-cream)' : (note.color?.bg ?? 'var(--color-cream)')
              const tc = typeof note === 'string' ? 'var(--color-roast)' : (note.color?.text ?? 'var(--color-roast)')
              return <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: bg, color: tc }}>{label}</span>
            })}
          </div>
        </div>
      )}

      {(b.origin_country || b.origin_region || b.farm || b.altitude_masl) && (
        <div className="rounded-lg p-4 grid grid-cols-2 gap-3" style={{ backgroundColor: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
          {b.origin_country && <DetailStat label="Country" value={b.origin_country} />}
          {b.origin_region && <DetailStat label="Region" value={b.origin_region} />}
          {b.farm && <DetailStat label="Farm" value={b.farm} />}
          {b.altitude_masl && <DetailStat label="Altitude" value={`${b.altitude_masl} masl`} />}
        </div>
      )}

      {(b.variety || roastery || b.price_per_100g) && (
        <div className="flex flex-col gap-3">
          {roastery && <BeanDetailRow label="Roastery" value={roastery.name} />}
          {b.variety && <BeanDetailRow label="Variety" value={b.variety} />}
          {b.price_per_100g && <BeanDetailRow label="Price" value={`€${Number(b.price_per_100g).toFixed(2)} / 100g`} />}
        </div>
      )}

      {(b.harvest_date || b.roast_date) && (
        <div className="flex flex-col gap-3">
          {b.harvest_date && <BeanDetailRow label="Harvest date" value={new Date(b.harvest_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })} />}
          {b.roast_date && <BeanDetailRow label="Roast date" value={new Date(b.roast_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })} />}
        </div>
      )}

      {b.notes && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-stone)' }}>Notes</p>
          <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-roast)' }}>"{b.notes}"</p>
        </div>
      )}
    </div>
  )
}

function DetailStat({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-stone)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--color-espresso)' }}>{value}</p>
    </div>
  )
}

function BeanDetailRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs uppercase tracking-wide shrink-0" style={{ color: 'var(--color-stone)' }}>{label}</span>
      <span className="text-sm text-right" style={{ color: 'var(--color-espresso)' }}>{value}</span>
    </div>
  )
}

function BeanCard({ bean: b, roasteryById, onView, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const roastery = roasteryById[b.roastery_id]
  const processStyle = PROCESS_COLORS[b.process?.toLowerCase()] ?? { bg: 'var(--color-cream)', text: 'var(--color-stone)' }
  const roastStyle = ROAST_COLORS[b.roast_level?.toLowerCase()] ?? { bg: 'var(--color-cream)', text: 'var(--color-stone)' }

  return (
    <article
      className="rounded-xl p-5 flex flex-col gap-3 relative cursor-pointer"
      style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)', boxShadow: hovered ? '0 4px 16px rgba(30,17,8,0.08)' : '0 1px 4px rgba(30,17,8,0.04)', transition: 'box-shadow 0.15s' }}
      onClick={onView}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute top-3 right-3 flex gap-1 transition-opacity" style={{ opacity: hovered ? 1 : 0 }}>
        <ActionBtn onClick={onEdit} label="Edit"><Pencil size={13} /></ActionBtn>
        <ActionBtn onClick={onDelete} label="Delete" danger><Trash2 size={13} /></ActionBtn>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {b.process && <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: processStyle.bg, color: processStyle.text }}>{b.process}</span>}
          {b.roast_level && <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: roastStyle.bg, color: roastStyle.text }}>{b.roast_level}</span>}
        </div>
        {b.rating && <StarRating value={b.rating} />}
      </div>

      <div>
        <h2 className="font-serif text-xl font-medium leading-tight" style={{ color: 'var(--color-espresso)' }}>{b.name}</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>
          {[roastery?.name, b.origin_country, b.origin_region].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="text-xs space-y-0.5" style={{ color: 'var(--color-stone)' }}>
        {b.variety && <p><span style={{ color: 'var(--color-espresso)', opacity: 0.6 }}>Variety</span>&nbsp; {b.variety}</p>}
        {b.farm && <p><span style={{ color: 'var(--color-espresso)', opacity: 0.6 }}>Farm</span>&nbsp; {b.farm}</p>}
        {b.altitude_masl && <p><span style={{ color: 'var(--color-espresso)', opacity: 0.6 }}>Altitude</span>&nbsp; {b.altitude_masl} masl</p>}
        {b.price_per_100g && <p><span style={{ color: 'var(--color-espresso)', opacity: 0.6 }}>Price</span>&nbsp; €{Number(b.price_per_100g).toFixed(2)} / 100g</p>}
      </div>

      {b.flavor_notes?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {b.flavor_notes.map((note, i) => {
            const label = typeof note === 'string' ? note : note.label
            const bg = typeof note === 'string' ? 'var(--color-cream)' : (note.color?.bg ?? 'var(--color-cream)')
            const tc = typeof note === 'string' ? 'var(--color-roast)' : (note.color?.text ?? 'var(--color-roast)')
            return <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: bg, color: tc }}>{label}</span>
          })}
        </div>
      )}

      {b.notes && (
        <p className="text-xs italic leading-relaxed border-t pt-3 line-clamp-2" style={{ color: 'var(--color-stone)', borderColor: 'var(--color-border)' }}>"{b.notes}"</p>
      )}
    </article>
  )
}
