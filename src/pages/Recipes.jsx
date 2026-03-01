import { useState, useEffect } from 'react'
import { Pencil, Trash2, Copy, Share2, Heart } from 'lucide-react'
import Drawer from '../components/Drawer'
import DetailPage from '../components/DetailPage'
import { Input, Textarea, Select, FieldRow, FieldSection } from '../components/FormFields'
import { ActionBtn, DeleteConfirm, FormActions } from './Roasteries'
import EmptyState from '../components/EmptyState'
import SharePopup from '../components/SharePopup'

// Deterministic badge color per equipment ID, prefers item.color if stored
function equipmentColor(id, item) {
  if (item?.color) return item.color
  const palette = [
    { bg: '#dbeafe', text: '#1e40af' },
    { bg: '#d1fae5', text: '#065f46' },
    { bg: '#fef3c7', text: '#92400e' },
    { bg: '#fce7f3', text: '#9d174d' },
    { bg: '#ede9fe', text: '#5b21b6' },
    { bg: '#fee2e2', text: '#991b1b' },
    { bg: '#ecfdf5', text: '#166534' },
    { bg: '#ffedd5', text: '#9a3412' },
    { bg: '#e0f2fe', text: '#075985' },
  ]
  if (!id || id === 'none') return null
  if (id === 'metal') return { bg: '#f1f5f9', text: '#475569' }
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return palette[Math.abs(hash) % palette.length]
}

function formatTime(secs) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const EMPTY = {
  title: '', bean_id: '',
  brewer_id: '', filter_id: '',
  dose_g: '', yield_g: '', water_temp_c: '', grind_size: '',
  grinder_id: '',
  time_m: '', time_s: '', steps: '', notes: '',
}

export default function Recipes({ recipes, beans, roasteries = [], equipment = [], onAdd, onUpdate, onDelete, copyRecipe, onCopyConsumed }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [cloningImportedId, setCloningImportedId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const detailItem = detailId ? (recipes.find(r => r.id === detailId) ?? null) : null
  const [shareId, setShareId] = useState(null)

  const beanById = Object.fromEntries(beans.map(b => [b.id, b]))
  const roasteryById = Object.fromEntries(roasteries.map(r => [r.id, r]))
  const equipmentById = Object.fromEntries(equipment.map(e => [e.id, e]))
  const grinders = equipment.filter(e => e.category === 'grinder')
  const filterPapers = equipment.filter(e => e.category === 'filter_paper')
  const brewers = equipment.filter(e => e.category === 'brewer')

  const [filterBean, setFilterBean] = useState('')
  const [filterRoastery, setFilterRoastery] = useState('')
  const [filterBrewer, setFilterBrewer] = useState('')
  const usedBeans = beans.filter(b => recipes.some(r => r.bean_id === b.id))
  const usedRoasteries = roasteries.filter(ro => usedBeans.some(b => b.roastery_id === ro.id))
  const usedBrewers = brewers.filter(br => recipes.some(r => r.brewer_id === br.id))
  const filteredRecipes = recipes.filter(r => {
    if (filterBean && r.bean_id !== filterBean) return false
    if (filterRoastery) {
      const bean = beanById[r.bean_id]
      if (!bean || bean.roastery_id !== filterRoastery) return false
    }
    if (filterBrewer && r.brewer_id !== filterBrewer) return false
    return true
  })
  const isFiltering = filterBean || filterRoastery || filterBrewer

  function openAdd() { setEditing(null); setCloningImportedId(null); setForm(EMPTY); setDrawerOpen(true) }
  function openCopy(r, techniqueOnly = false) {
    setEditing(null)
    setCloningImportedId(null)
    setForm({
      title: `${r.title ?? 'Recipe'} (copy)`,
      bean_id: techniqueOnly ? '' : (r.bean_id ?? ''),
      brewer_id: r.brewer_id ?? '', filter_id: r.filter_id ?? '',
      dose_g: r.dose_g ?? '', yield_g: r.yield_g ?? '',
      water_temp_c: r.water_temp_c ?? '',
      grind_size: r.grind_size || r.grinder_setting || '',
      grinder_id: r.grinder_id ?? '',
      time_m: r.brew_time_sec != null ? String(Math.floor(r.brew_time_sec / 60)) : '',
      time_s: r.brew_time_sec != null ? String(r.brew_time_sec % 60).padStart(2, '0') : '',
      steps: r.steps ?? '',
      notes: r.notes ?? '',
    })
    setDetailId(null)
    setDrawerOpen(true)
  }
  function openClone(r) {
    setEditing(null)
    setCloningImportedId(r.imported ? r.id : null)
    setForm({
      title: `${r.title ?? 'Recipe'} (clone)`,
      bean_id: r.bean_id ?? '',
      brewer_id: r.brewer_id ?? '', filter_id: r.filter_id ?? '',
      dose_g: r.dose_g ?? '', yield_g: r.yield_g ?? '',
      water_temp_c: r.water_temp_c ?? '',
      grind_size: r.grind_size || r.grinder_setting || '',
      grinder_id: r.grinder_id ?? '',
      time_m: r.brew_time_sec != null ? String(Math.floor(r.brew_time_sec / 60)) : '',
      time_s: r.brew_time_sec != null ? String(r.brew_time_sec % 60).padStart(2, '0') : '',
      steps: r.steps ?? '',
      notes: r.notes ?? '',
    })
    setDetailId(null)
    setDrawerOpen(true)
  }
  function openEdit(r) {
    setEditing(r)
    setForm({
      title: r.title ?? '', bean_id: r.bean_id ?? '',
      brewer_id: r.brewer_id ?? '', filter_id: r.filter_id ?? '',
      dose_g: r.dose_g ?? '', yield_g: r.yield_g ?? '',
      water_temp_c: r.water_temp_c ?? '',
      grind_size: r.grind_size || r.grinder_setting || '',
      grinder_id: r.grinder_id ?? '',
      time_m: r.brew_time_sec != null ? String(Math.floor(r.brew_time_sec / 60)) : '',
      time_s: r.brew_time_sec != null ? String(r.brew_time_sec % 60).padStart(2, '0') : '',
      steps: r.steps ?? '', 
      notes: r.notes ?? '',
    })
    setDrawerOpen(true)
  }
  function handleSubmit(e) {
    e.preventDefault()
    const brewer = equipmentById[form.brewer_id]
    const filterItem = form.filter_id === 'metal' ? { name: 'Metal' }
      : form.filter_id === 'none' ? { name: 'None' }
      : form.filter_id ? equipmentById[form.filter_id]
      : null
    const data = {
      ...form,
      brew_method: brewer?.name ?? '',              // derive text name for Supabase
      filter_type: filterItem?.name ?? '',
      dose_g: form.dose_g ? Number(form.dose_g) : null,
      yield_g: form.yield_g ? Number(form.yield_g) : null,
      water_temp_c: form.water_temp_c ? Number(form.water_temp_c) : null,
      brew_time_sec: (form.time_m || form.time_s)
        ? (Number(form.time_m || 0) * 60 + Number(form.time_s || 0)) || null
        : null,
    }
    editing ? onUpdate(editing.id, data) : onAdd(cloningImportedId ? { ...data, origin_id: cloningImportedId } : data)
    if (!editing && cloningImportedId) { onDelete(cloningImportedId); setCloningImportedId(null) }
    setDrawerOpen(false)
  }
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  // Auto-open copy drawer when arriving from a shared recipe link
  useEffect(() => {
    if (copyRecipe) {
      openCopy(copyRecipe, true) // technique only — no bean, no rating
      onCopyConsumed?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyRecipe])

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-medium mb-1" style={{ color: 'var(--color-espresso)' }}>Recipes</h1>
          <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
            {isFiltering ? `${filteredRecipes.length} of ${recipes.length}` : recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
          </p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:opacity-80" style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}>
          + Add recipe
        </button>
      </div>

      {recipes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {usedRoasteries.length > 0 && (
            <select value={filterRoastery} onChange={e => { setFilterRoastery(e.target.value); setFilterBean('') }} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}>
              <option value="">All roasteries</option>
              {usedRoasteries.map(ro => <option key={ro.id} value={ro.id}>{ro.name}</option>)}
            </select>
          )}
          {usedBeans.length > 0 && (
            <select value={filterBean} onChange={e => { setFilterBean(e.target.value); setFilterRoastery('') }} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}>
              <option value="">All beans</option>
              {(filterRoastery ? usedBeans.filter(b => b.roastery_id === filterRoastery) : usedBeans).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          {usedBrewers.length > 0 && (
            <select value={filterBrewer} onChange={e => setFilterBrewer(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}>
              <option value="">All brewers</option>
              {usedBrewers.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
            </select>
          )}
          {isFiltering && (
            <button onClick={() => { setFilterBean(''); setFilterRoastery(''); setFilterBrewer('') }} className="px-3 py-1.5 text-sm rounded-lg cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-stone)', backgroundColor: '#fff' }}>Clear</button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRecipes.map(r => (
        <RecipeCard key={r.id} recipe={r} beanById={beanById} roasteryById={roasteryById} equipmentById={equipmentById} onView={() => setDetailId(r.id)} onEdit={() => openEdit(r)} onCopy={() => openCopy(r)} onClone={() => openClone(r)} onDelete={() => setDeleteConfirm(r.id)} onFavorite={() => onUpdate(r.id, { is_favorite: !r.is_favorite })} />
        ))}
      </div>

      {recipes.length === 0 && (
        <EmptyState
          icon="📋"
          title="No recipes yet"
          description="Log your first brew — grind size, ratio, steps. Stop guessing why Tuesday's cup was perfect."
          action="+ Add your first recipe"
          onAction={openAdd}
        />
      )}
      {recipes.length > 0 && filteredRecipes.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--color-stone)' }}>No recipes match your filters.</p>
      )}

      {deleteConfirm && (
        <DeleteConfirm message="Delete this recipe?" onConfirm={() => { onDelete(deleteConfirm); setDeleteConfirm(null) }} onCancel={() => setDeleteConfirm(null)} />
      )}

      {/* Detail page */}
      <DetailPage
        fullscreen
        open={!!detailItem}
        onClose={() => setDetailId(null)}
        title={detailItem?.title ?? ''}
        footer={
          <div className="flex gap-2">
            {detailItem?.imported ? (
              <>
                <button type="button" onClick={() => { setDetailId(null); openClone(detailItem) }} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center justify-center gap-1.5" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}><Copy size={13} /> Clone</button>
                <button type="button" onClick={() => setShareId(detailItem?.id)} className="py-2 px-3 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }} title="Share"><Share2 size={14} /></button>
                <button type="button" onClick={() => { setDetailId(null); setDeleteConfirm(detailItem?.id) }} className="py-2 px-4 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid #fecaca', color: '#991b1b', backgroundColor: '#fff' }}>Remove</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => openEdit(detailItem)} className="flex-1 py-2 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }}>Edit</button>
                <button type="button" onClick={() => openCopy(detailItem)} className="py-2 px-4 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }} title="Duplicate recipe"><Copy size={14} /> Copy</button>
                <button type="button" onClick={() => setShareId(detailItem?.id)} className="py-2 px-3 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5" style={{ border: '1px solid var(--color-border)', color: 'var(--color-espresso)', backgroundColor: '#fff' }} title="Share"><Share2 size={14} /></button>
                <button type="button" onClick={() => { setDetailId(null); setDeleteConfirm(detailItem?.id) }} className="py-2 px-4 rounded-md text-sm font-medium cursor-pointer" style={{ border: '1px solid #fecaca', color: '#991b1b', backgroundColor: '#fff' }}>Delete</button>
              </>
            )}
          </div>
        }
      >
        {detailItem && <RecipeDetail recipe={detailItem} beanById={beanById} roasteryById={roasteryById} equipmentById={equipmentById} />}
      </DetailPage>

      {shareId && (
        <SharePopup
          url={`${window.location.origin}/share/recipe/${shareId}`}
          onClose={() => setShareId(null)}
        />
      )}

      {/* Edit / Add drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit recipe' : cloningImportedId ? 'Clone recipe' : 'Add recipe'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Title" required value={form.title} onChange={set('title')} placeholder="Ethiopia V60 — fruity" maxLength={150} />

          <Select label="Bean" value={form.bean_id} onChange={set('bean_id')}>
            <option value="">— None —</option>
            {beans.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>

          <FieldSection title="Setup" />
          <FieldRow>
            <Select label="Brewer" value={form.brewer_id} onChange={set('brewer_id')}>
              <option value="">— None —</option>
              {brewers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select label="Filter" value={form.filter_id} onChange={set('filter_id')}>
              <option value="">— None —</option>
              {filterPapers.length > 0 && filterPapers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              <option value="metal">Metal filter</option>
              <option value="none">No filter</option>
            </Select>
          </FieldRow>
          <FieldRow>
            <Select label="Grinder" value={form.grinder_id} onChange={set('grinder_id')}>
              <option value="">— None —</option>
              {grinders.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
            <Input label="Grind" value={form.grind_size} onChange={set('grind_size')} placeholder="medium-fine, 20 clicks…" maxLength={80} />
          </FieldRow>

          <FieldSection title="Parameters" />
          <FieldRow>
            <Input label="Dose (g)" type="number" step="0.1" value={form.dose_g} onChange={set('dose_g')} placeholder="15" />
            <Input label="Yield (g)" type="number" step="0.1" value={form.yield_g} onChange={set('yield_g')} placeholder="250" />
          </FieldRow>
          <FieldRow>
            <Input label="Water temp (°C)" type="number" step="0.5" value={form.water_temp_c} onChange={set('water_temp_c')} placeholder="94" />
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-stone)' }}>Brew time</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min="0" max="99"
                  value={form.time_m}
                  onChange={set('time_m')}
                  placeholder="3"
                  className="w-0 flex-1 px-3 py-2 rounded-md text-sm outline-none text-center"
                  style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--color-roast)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
                <span className="text-sm font-medium shrink-0" style={{ color: 'var(--color-stone)' }}>m</span>
                <input
                  type="number" min="0" max="59"
                  value={form.time_s}
                  onChange={set('time_s')}
                  placeholder="30"
                  className="w-0 flex-1 px-3 py-2 rounded-md text-sm outline-none text-center"
                  style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--color-roast)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
                <span className="text-sm font-medium shrink-0" style={{ color: 'var(--color-stone)' }}>s</span>
              </div>
            </div>
          </FieldRow>
          <FieldSection title="Instructions" />
          <Textarea label="Step-by-step" rows={5} value={form.steps} onChange={set('steps')} placeholder={"1. Bloom 30g, 45s\n2. Pour to 125g at 1:00\n…"} maxLength={2000} />
          <Textarea label="Notes" rows={2} value={form.notes} onChange={set('notes')} placeholder="What worked, what to tweak…" maxLength={500} />
          <FormActions editing={!!editing} label="recipe" onCancel={() => setDrawerOpen(false)} />
        </form>
      </Drawer>
    </div>
  )
}

function RecipeCard({ recipe: r, beanById, roasteryById, equipmentById, onView, onEdit, onCopy, onClone, onDelete, onFavorite }) {
  const [hovered, setHovered] = useState(false)
  const bean = beanById[r.bean_id]
  const roastery = bean ? roasteryById?.[bean.roastery_id] : null
  const grinder = equipmentById?.[r.grinder_id]
  const brewer = equipmentById?.[r.brewer_id]
  const filter = r.filter_id === 'metal' ? { name: 'Metal filter' } : r.filter_id === 'none' ? null : equipmentById?.[r.filter_id]
  const brewerColor = equipmentColor(r.brewer_id, equipmentById?.[r.brewer_id])
  const filterColor = equipmentColor(r.filter_id, equipmentById?.[r.filter_id])
  const ratio = r.yield_g && r.dose_g ? `1:${(r.yield_g / r.dose_g).toFixed(1)}` : null

  return (
    <article
      className="rounded-xl p-5 flex flex-col gap-3 relative cursor-pointer"
      style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)', boxShadow: hovered ? '0 4px 16px rgba(30,17,8,0.08)' : '0 1px 4px rgba(30,17,8,0.04)', transition: 'box-shadow 0.15s' }}
      onClick={onView}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <div className="card-actions absolute top-3 right-3 flex gap-1 transition-opacity" style={{ opacity: hovered ? 1 : 0 }}>
        {r.imported ? (
          <ActionBtn onClick={onClone} label="Clone"><Copy size={13} /></ActionBtn>
        ) : (
          <>
            <ActionBtn onClick={onEdit} label="Edit"><Pencil size={13} /></ActionBtn>
            <ActionBtn onClick={onCopy} label="Duplicate"><Copy size={13} /></ActionBtn>
          </>
        )}
        <ActionBtn onClick={onDelete} label={r.imported ? 'Remove' : 'Delete'} danger><Trash2 size={13} /></ActionBtn>
      </div>
      <button onClick={e => { e.stopPropagation(); onFavorite() }} className="absolute bottom-2 right-2 cursor-pointer" title={r.is_favorite ? 'Unfavourite' : 'Favourite'} style={{ background: 'none', border: 'none', padding: 8, opacity: r.is_favorite || hovered ? 1 : 0.3, transition: 'opacity 0.15s' }}>
        <Heart size={14} fill={r.is_favorite ? 'currentColor' : 'none'} style={{ color: r.is_favorite ? '#b91c1c' : 'var(--color-stone)' }} />
      </button>

      <div className="flex items-start justify-between gap-2 pr-32">
        <div className="flex flex-wrap gap-1">
          {brewer && brewerColor && <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: brewerColor.bg, color: brewerColor.text }}>{brewer.name}</span>}
          {filter && filterColor && <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: filterColor.bg, color: filterColor.text }}>{filter.name}</span>}
          {r.imported && <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}>Cloned</span>}
        </div>
      </div>

      <div>
        <h2 className="font-serif text-xl font-medium leading-tight" style={{ color: 'var(--color-espresso)' }}>{r.title}</h2>
        {bean && <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>{bean.name}{roastery ? <span> · {roastery.name}</span> : ''}</p>}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs rounded-lg p-3" style={{ backgroundColor: 'var(--color-cream)' }}>
        {r.dose_g && r.yield_g && (
          <p style={{ color: 'var(--color-espresso)' }}>
            <span style={{ color: 'var(--color-stone)' }}>Dose → Yield</span><br />
            {r.dose_g}g → {r.yield_g}g {ratio && <span style={{ color: 'var(--color-stone)' }}>({ratio})</span>}
          </p>
        )}
        {r.water_temp_c && (
          <p style={{ color: 'var(--color-espresso)' }}>
            <span style={{ color: 'var(--color-stone)' }}>Temp</span><br />{r.water_temp_c}°C
          </p>
        )}
        {r.grind_size && (
          <p style={{ color: 'var(--color-espresso)' }}>
            <span style={{ color: 'var(--color-stone)' }}>Grind</span><br />{r.grind_size}
          </p>
        )}
        {grinder && (
          <p style={{ color: 'var(--color-espresso)' }}>
            <span style={{ color: 'var(--color-stone)' }}>Grinder</span><br />{grinder.name}
          </p>
        )}
        {r.brew_time_sec && (
          <p style={{ color: 'var(--color-espresso)' }}>
            <span style={{ color: 'var(--color-stone)' }}>Time</span><br />{formatTime(r.brew_time_sec)}
          </p>
        )}
      </div>

      {r.notes && (
        <p className="text-xs italic leading-relaxed border-t pt-3 line-clamp-2" style={{ color: 'var(--color-stone)', borderColor: 'var(--color-border)' }}>"{r.notes}"</p>
      )}
    </article>
  )
}
function RecipeDetail({ recipe: r, beanById, roasteryById, equipmentById }) {
  const bean = beanById[r.bean_id]
  const roastery = bean ? roasteryById?.[bean.roastery_id] : null
  const grinder = equipmentById?.[r.grinder_id]
  const brewer = equipmentById?.[r.brewer_id]
  const filter = r.filter_id === 'metal' ? { name: 'Metal filter' } : r.filter_id === 'none' ? null : equipmentById?.[r.filter_id]
  const brewerColor = equipmentColor(r.brewer_id, equipmentById?.[r.brewer_id])
  const filterColor = equipmentColor(r.filter_id, equipmentById?.[r.filter_id])
  const ratio = r.yield_g && r.dose_g ? `1:${(r.yield_g / r.dose_g).toFixed(1)}` : null

  return (
    <div className="flex flex-col gap-5">
      {/* Badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {brewer && brewerColor && <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ backgroundColor: brewerColor.bg, color: brewerColor.text }}>{brewer.name}</span>}
          {filter && filterColor && <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ backgroundColor: filterColor.bg, color: filterColor.text }}>{filter.name}</span>}
        </div>
      </div>

      {bean && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-stone)' }}>Bean</p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-espresso)' }}>{bean.name}</p>
          {roastery && <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>{roastery.name}{roastery.country ? ` · ${roastery.country}` : ''}</p>}
        </div>
      )}

      {/* Parameters grid */}
      {(r.dose_g || r.yield_g || r.water_temp_c || r.brew_time_sec) && (
        <div className="rounded-lg p-4 grid grid-cols-2 gap-3" style={{ backgroundColor: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
          {r.dose_g && r.yield_g && (
            <div className="col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-stone)' }}>Dose → Yield</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-espresso)' }}>{r.dose_g}g → {r.yield_g}g {ratio && <span className="text-xs font-normal" style={{ color: 'var(--color-stone)' }}>({ratio})</span>}</p>
            </div>
          )}
          {r.water_temp_c && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-stone)' }}>Temp</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-espresso)' }}>{r.water_temp_c}°C</p>
            </div>
          )}
          {r.brew_time_sec && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-stone)' }}>Time</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-espresso)' }}>{formatTime(r.brew_time_sec)}</p>
            </div>
          )}
        </div>
      )}

      {/* Grind + equipment */}
      {(r.grind_size || grinder || brewer || filter) && (
        <div className="flex flex-col gap-3">
          {r.grind_size && <RecipeDetailRow label="Grind size" value={r.grind_size} />}
          {grinder && <RecipeDetailRow label="Grinder" value={grinder.name} />}
          {filter && filter.name !== 'Metal filter' && <RecipeDetailRow label="Filter" value={filter.name} />}
        </div>
      )}

      {/* Steps — prominent */}
      {r.steps && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--color-stone)' }}>Instructions</p>
          <div className="flex flex-col gap-2">
            {r.steps.split('\n').filter(s => s.trim()).map((step, i) => (
              <div key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mt-0.5" style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}>{i + 1}</span>
                <p style={{ color: 'var(--color-espresso)' }}>{step.replace(/^\d+\.\s*/, '')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {r.notes && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-stone)' }}>Notes</p>
          <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-roast)' }}>"{r.notes}"</p>
        </div>
      )}
    </div>
  )
}

function RecipeDetailRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs uppercase tracking-wide shrink-0" style={{ color: 'var(--color-stone)' }}>{label}</span>
      <span className="text-sm text-right" style={{ color: 'var(--color-espresso)' }}>{value}</span>
    </div>
  )
}