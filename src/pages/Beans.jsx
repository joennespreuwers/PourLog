import { useState, useRef, useEffect } from 'react'
import { Pencil, Trash2, Share2, Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Drawer from '../components/Drawer'
import DetailPage from '../components/DetailPage'
import TagInput, { TAG_PALETTE, SCA_FLAT } from '../components/TagInput'
import { Input, Textarea, Select, FieldRow, FieldSection } from '../components/FormFields'
import EmptyState from '../components/EmptyState'
import { ActionBtn, DeleteConfirm, FormActions } from './Roasteries'
import SharePopup from '../components/SharePopup'

// Normalise a flavor note to { label, color } — handles both stored strings and legacy objects
function normNote(note) {
  if (typeof note === 'object' && note !== null && note.label) return note
  const str = typeof note === 'string' ? note : JSON.stringify(note)
  const fromJson = (() => { try { const p = JSON.parse(str); return p?.label ?? null } catch { return null } })()
  const label = fromJson ?? str
  const found = SCA_FLAT?.find(s => s.label === label)
  return { label, color: found?.color ?? TAG_PALETTE[11] }
}

const PROCESS_COLORS = {
  washed:                 { bg: '#dbeafe', text: '#1e3a8a' },
  'wet-hulled':           { bg: '#bfdbfe', text: '#1e40af' },
  natural:                { bg: '#fef3c7', text: '#92400e' },
  honey:                  { bg: '#fde68a', text: '#78350f' },
  'yellow honey':         { bg: '#fef9c3', text: '#854d0e' },
  'red honey':            { bg: '#fecaca', text: '#991b1b' },
  'black honey':          { bg: '#4c1d95', text: '#ede9fe' },
  'anaerobic natural':    { bg: '#f5d0fe', text: '#7e22ce' },
  'anaerobic washed':     { bg: '#e0e7ff', text: '#3730a3' },
  'carbonic maceration':  { bg: '#fecdd3', text: '#9f1239' },
  'extended fermentation':{ bg: '#ffedd5', text: '#9a3412' },
  'double fermented':     { bg: '#ede9fe', text: '#5b21b6' },
  'lactic fermentation':  { bg: '#d1fae5', text: '#065f46' },
  'koji fermentation':    { bg: '#fce7f3', text: '#9d174d' },
  'wine process':         { bg: '#fce7e7', text: '#7f1d1d' },
  'thermal shock':        { bg: '#e0f2fe', text: '#0c4a6e' },
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
  roast_date: '', flavor_notes: [], price_per_100g: '', notes: '',
}

export default function Beans({ user, beans, roasteries, onAdd, onUpdate, onDelete }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const detailItem = detailId ? (beans.find(b => b.id === detailId) ?? null) : null
  const [shareId, setShareId] = useState(null)

  // Community search state
  const [collecting, setCollecting] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const searchTimer = useRef(null)

  const roasteryById = Object.fromEntries(roasteries.map(r => [r.id, r]))

  const [filterRoastery, setFilterRoastery] = useState('')
  const [filterProcess, setFilterProcess] = useState('')
  const [filterRoastLevel, setFilterRoastLevel] = useState('')
  const processes = [...new Set(beans.map(b => b.process).filter(Boolean))].sort()
  const roastLevels = [...new Set(beans.map(b => b.roast_level).filter(Boolean))]
  const filtered = beans.filter(b => {
    if (filterRoastery && b.roastery_id !== filterRoastery) return false
    if (filterProcess && b.process !== filterProcess) return false
    if (filterRoastLevel && b.roast_level !== filterRoastLevel) return false
    return true
  })
  const isFiltering = filterRoastery || filterProcess || filterRoastLevel

  // Debounced community search
  useEffect(() => {
    if (collecting || !form.name || form.name.length < 2) { setSuggestions([]); return }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('beans')
        .select('id, name, roastery_id, origin_country, origin_region, farm, variety, process, roast_level, altitude_masl, flavor_notes, photo_url')
        .ilike('name', `%${form.name}%`)
        .limit(6)
      const myIds = new Set(beans.map(b => b.id))
      setSuggestions((data ?? []).filter(s => !myIds.has(s.id)))
    }, 320)
    return () => clearTimeout(searchTimer.current)
  }, [form.name, collecting, beans])

  function openAdd() { setEditing(null); setCollecting(null); setSuggestions([]); setForm(EMPTY); setDrawerOpen(true) }
  function openEdit(b) {
    setEditing(b); setCollecting(null); setSuggestions([])
    setForm({
      name: b.name ?? '', roastery_id: b.roastery_id ?? '', origin_country: b.origin_country ?? '',
      origin_region: b.origin_region ?? '', farm: b.farm ?? '', variety: b.variety ?? '',
      process: b.process ?? '', roast_level: b.roast_level ?? '', altitude_masl: b.altitude_masl ?? '',
      harvest_date: b.harvest_date ?? '', roast_date: b.roast_date ?? '',
      flavor_notes: (b.flavor_notes ?? []).map(normNote), price_per_100g: b.price_per_100g ?? '',
      notes: b.notes ?? '',
    })
    setDrawerOpen(true)
  }

  function pickSuggestion(s) {
    setCollecting(s)
    setForm(prev => ({
      ...EMPTY,
      name: s.name, roastery_id: s.roastery_id ?? '', origin_country: s.origin_country ?? '',
      origin_region: s.origin_region ?? '', farm: s.farm ?? '', variety: s.variety ?? '',
      process: s.process ?? '', roast_level: s.roast_level ?? '', altitude_masl: s.altitude_masl ?? '',
      flavor_notes: (s.flavor_notes ?? []).map(normNote),
      notes: prev.notes,
    }))
    setSuggestions([])
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (collecting) {
      onAdd({ existing_id: collecting.id, globalData: collecting, notes: form.notes })
      setCollecting(null)
      setDrawerOpen(false)
      return
    }
    const data = {
      ...form,
      altitude_masl:  form.altitude_masl  ? Number(form.altitude_masl)  : null,
      price_per_100g: form.price_per_100g ? Number(form.price_per_100g) : null,
      harvest_date:   form.harvest_date   || null,
      roast_date:     form.roast_date     || null,
      roastery_id:    form.roastery_id    || null,
      flavor_notes:   (form.flavor_notes ?? []).map(n => (typeof n === 'object' && n?.label) ? n.label : String(n)),
    }
    editing ? onUpdate(editing.id, data) : onAdd(data)
    setDrawerOpen(false)
  }
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const isCreator = editing ? editing.created_by === user?.id : true

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1" style={{ color: 'var(--color-espresso)' }}>Beans</h1>
          <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
            {isFiltering ? `${filtered.length} of ${beans.length}` : beans.length} {beans.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:opacity-80" style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}>
          + Add bean
        </button>
      </div>

      {beans.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {roasteries.length > 1 && (
            <select value={filterRoastery} onChange={e => setFilterRoastery(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}>
              <option value="">All roasteries</option>
              {roasteries.filter(r => beans.some(b => b.roastery_id === r.id)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          {processes.length > 0 && (
            <select value={filterProcess} onChange={e => setFilterProcess(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}>
              <option value="">All processes</option>
              {processes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {roastLevels.length > 0 && (
            <select value={filterRoastLevel} onChange={e => setFilterRoastLevel(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}>
              <option value="">All roast levels</option>
              {roastLevels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
          {isFiltering && (
            <button onClick={() => { setFilterRoastery(''); setFilterProcess(''); setFilterRoastLevel('') }} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-stone)', backgroundColor: '#fff' }}>Clear</button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(b => (
          <BeanCard key={b.id} bean={b} user={user} roasteryById={roasteryById} onView={() => setDetailId(b.id)} onEdit={() => openEdit(b)} onDelete={() => setDeleteConfirm(b.id)} onFavorite={() => onUpdate(b.id, { is_favorite: !b.is_favorite })} />
        ))}
      </div>

      {beans.length === 0 && (
        <EmptyState icon="🫘" title="No beans logged yet" description="Track what's on your shelf — origin, process, roast level and tasting notes." action="+ Add your first bean" onAction={openAdd} />
      )}
      {beans.length > 0 && filtered.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--color-stone)' }}>No beans match your filters.</p>
      )}

      {deleteConfirm && (
        <DeleteConfirm
          message="Remove from collection?"
          note="The bean stays in the community library."
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
        {detailItem && <BeanDetail b={detailItem} roasteryById={roasteryById} />}
      </DetailPage>

      {shareId && (
        <SharePopup url={`${window.location.origin}/share/bean/${shareId}`} onClose={() => setShareId(null)} />
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit bean' : collecting ? 'Collect bean' : 'Add bean'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {collecting && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#ecfdf5', border: '1px solid #86efac', color: '#166534' }}>
              Collecting <strong>{collecting.name}</strong> — add your personal notes below.
              <button type="button" onClick={() => { setCollecting(null); setSuggestions([]); setForm(EMPTY) }} className="ml-2 underline text-xs cursor-pointer" style={{ background: 'none', border: 'none', color: '#166534' }}>Cancel</button>
            </div>
          )}

          <div className="relative">
            <Input label="Name" required value={form.name} onChange={set('name')} placeholder="Timor-Timu Natural" maxLength={100} disabled={!!collecting || (editing && !isCreator)} />
            {suggestions.length > 0 && !editing && !collecting && (
              <ul className="absolute z-10 w-full mt-1 rounded-lg shadow-md overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)' }}>
                {suggestions.map(s => (
                  <li key={s.id}>
                    <button type="button" onClick={() => pickSuggestion(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between cursor-pointer" style={{ color: 'var(--color-espresso)' }}>
                      <span>{s.name}</span>
                      <span className="text-xs" style={{ color: 'var(--color-stone)' }}>{[s.origin_country, s.process].filter(Boolean).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!collecting && (
            <>
              <Select label="Roastery" value={form.roastery_id} onChange={set('roastery_id')} disabled={editing && !isCreator}>
                <option value="">— None —</option>
                {roasteries.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>

              <FieldSection title="Origin" />
              <FieldRow>
                <Input label="Country" value={form.origin_country} onChange={set('origin_country')} placeholder="Ethiopia" maxLength={100} disabled={editing && !isCreator} />
                <Input label="Region" value={form.origin_region} onChange={set('origin_region')} placeholder="Yirgacheffe" maxLength={100} disabled={editing && !isCreator} />
              </FieldRow>
              <FieldRow>
                <Input label="Farm / Cooperative" value={form.farm} onChange={set('farm')} placeholder="Worka Cooperative" maxLength={100} disabled={editing && !isCreator} />
                <Input label="Altitude (masl)" type="number" value={form.altitude_masl} onChange={set('altitude_masl')} placeholder="1900" disabled={editing && !isCreator} />
              </FieldRow>

              <FieldSection title="Coffee" />
              <FieldRow>
                <Input label="Variety" value={form.variety} onChange={set('variety')} placeholder="Heirloom, Gesha…" maxLength={100} disabled={editing && !isCreator} />
                <Select label="Process" value={form.process} onChange={set('process')} disabled={editing && !isCreator}>
                  <option value="">—</option>
                  {['washed', 'natural', 'honey', 'yellow honey', 'red honey', 'black honey',
                    'anaerobic natural', 'anaerobic washed', 'wet-hulled', 'carbonic maceration',
                    'extended fermentation', 'double fermented', 'lactic fermentation',
                    'koji fermentation', 'wine process', 'thermal shock',
                  ].map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </FieldRow>
              <FieldRow>
                <Select label="Roast level" value={form.roast_level} onChange={set('roast_level')} disabled={editing && !isCreator}>
                  <option value="">—</option>
                  {['ultra light', 'light', 'light-medium', 'medium', 'medium-dark', 'dark', 'very dark'].map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
                <Input label="Price / 100g (€)" type="number" step="0.01" value={form.price_per_100g} onChange={set('price_per_100g')} placeholder="4.80" disabled={editing && !isCreator} />
              </FieldRow>

              <FieldSection title="Dates" />
              <FieldRow>
                <Input label="Harvest date" type="date" value={form.harvest_date} onChange={set('harvest_date')} disabled={editing && !isCreator} />
                <Input label="Roast date" type="date" value={form.roast_date} onChange={set('roast_date')} disabled={editing && !isCreator} />
              </FieldRow>

              <TagInput label="Flavor notes" value={form.flavor_notes} onChange={v => setForm(p => ({ ...p, flavor_notes: v }))} />
            </>
          )}

          <Textarea label="Personal notes" rows={3} value={form.notes} onChange={set('notes')} placeholder="Your tasting impressions…" maxLength={500} />

          {editing && !isCreator && (
            <p className="text-xs" style={{ color: 'var(--color-stone)' }}>You can only edit your personal notes — this bean was created by someone else.</p>
          )}

          <FormActions editing={!!editing} collectMode={!!collecting} label="bean" onCancel={() => setDrawerOpen(false)} />
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
      </div>

      {b.flavor_notes?.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-stone)' }}>Flavor notes</p>
          <div className="flex flex-wrap gap-1.5">
            {b.flavor_notes.map((note, i) => {
              const { label, color } = normNote(note)
              return <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: color.bg, color: color.text }}>{label}</span>
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
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-stone)' }}>My notes</p>
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

function BeanCard({ bean: b, user, roasteryById, onView, onEdit, onDelete, onFavorite }) {
  const [hovered, setHovered] = useState(false)
  const roastery = roasteryById[b.roastery_id]
  const isCreator = b.created_by === user?.id
  const processStyle = PROCESS_COLORS[b.process?.toLowerCase()] ?? { bg: 'var(--color-cream)', text: 'var(--color-stone)' }
  const roastStyle = ROAST_COLORS[b.roast_level?.toLowerCase()] ?? { bg: 'var(--color-cream)', text: 'var(--color-stone)' }

  return (
    <article
      className="rounded-xl p-5 flex flex-col gap-3 relative cursor-pointer"
      style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)', boxShadow: hovered ? '0 4px 16px rgba(30,17,8,0.08)' : '0 1px 4px rgba(30,17,8,0.04)', transition: 'box-shadow 0.15s' }}
      onClick={onView}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <div className="card-actions absolute top-3 right-3 flex gap-1 transition-opacity" style={{ opacity: hovered ? 1 : 0 }}>
        {isCreator && <ActionBtn onClick={onEdit} label="Edit"><Pencil size={13} /></ActionBtn>}
        <ActionBtn onClick={onDelete} label="Remove" danger><Trash2 size={13} /></ActionBtn>
      </div>
      <button onClick={e => { e.stopPropagation(); onFavorite() }} className="absolute bottom-2 right-2 cursor-pointer" title={b.is_favorite ? 'Unfavourite' : 'Favourite'} style={{ background: 'none', border: 'none', padding: 8, opacity: b.is_favorite || hovered ? 1 : 0.3, transition: 'opacity 0.15s' }}>
        <Heart size={14} fill={b.is_favorite ? 'currentColor' : 'none'} style={{ color: b.is_favorite ? '#b91c1c' : 'var(--color-stone)' }} />
      </button>

      <div className="flex items-start justify-between gap-2 pr-20">
        <div className="flex flex-wrap gap-1">
          {b.process && <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: processStyle.bg, color: processStyle.text }}>{b.process}</span>}
          {b.roast_level && <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: roastStyle.bg, color: roastStyle.text }}>{b.roast_level}</span>}
        </div>
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
            const { label, color } = normNote(note)
            return <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: color.bg, color: color.text }}>{label}</span>
          })}
        </div>
      )}

      {b.notes && (
        <p className="text-xs italic leading-relaxed border-t pt-3 line-clamp-2" style={{ color: 'var(--color-stone)', borderColor: 'var(--color-border)' }}>"{b.notes}"</p>
      )}
    </article>
  )
}

