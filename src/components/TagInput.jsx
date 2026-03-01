import { useState, useRef, useEffect } from 'react'
import { Label } from './FormFields'

export const TAG_PALETTE = [
  { bg: '#fce7f3', text: '#9d174d' }, // berry pink
  { bg: '#fee2e2', text: '#991b1b' }, // stone fruit red
  { bg: '#ffedd5', text: '#9a3412' }, // tropical orange
  { bg: '#fef9c3', text: '#854d0e' }, // citrus yellow
  { bg: '#fef3c7', text: '#92400e' }, // amber / dried fruit
  { bg: '#fdf4ff', text: '#7e22ce' }, // floral violet
  { bg: '#ede9fe', text: '#5b21b6' }, // purple / fermented
  { bg: '#dbeafe', text: '#1e40af' }, // blue / washed
  { bg: '#d1fae5', text: '#065f46' }, // green / herbal
  { bg: '#ecfdf5', text: '#166534' }, // teal / clean
  { bg: '#e7e0d8', text: '#3b1a0a' }, // roasted brown
  { bg: '#f5f0eb', text: '#5c3d2e' }, // nutty neutral
]

const SCA_FLAVORS = [
  { category: 'Berry',      color: TAG_PALETTE[0],  notes: ['blueberry', 'raspberry', 'strawberry', 'blackberry', 'blackcurrant', 'cranberry', 'pomegranate'] },
  { category: 'Stone',      color: TAG_PALETTE[1],  notes: ['cherry', 'peach', 'apricot', 'plum', 'nectarine'] },
  { category: 'Tropical',   color: TAG_PALETTE[2],  notes: ['mango', 'pineapple', 'passion fruit', 'papaya', 'guava', 'lychee', 'banana', 'coconut'] },
  { category: 'Other Fruit',color: TAG_PALETTE[9],  notes: ['apple', 'pear', 'grape', 'peach', 'melon'] },
  { category: 'Citrus',     color: TAG_PALETTE[3],  notes: ['lemon', 'lime', 'orange', 'grapefruit', 'bergamot', 'yuzu', 'mandarin'] },
  { category: 'Dried',      color: TAG_PALETTE[4],  notes: ['raisin', 'prune', 'fig', 'date', 'tamarind'] },
  { category: 'Fermented',  color: TAG_PALETTE[6],  notes: ['winey', 'whiskey', 'fermented', 'overripe', 'wine', 'boozy'] },
  { category: 'Floral',     color: TAG_PALETTE[5],  notes: ['jasmine', 'rose', 'chamomile', 'elderflower', 'orange blossom', 'lavender', 'hibiscus'] },
  { category: 'Spices',     color: TAG_PALETTE[8],  notes: ['cinnamon', 'clove', 'black pepper', 'anise', 'nutmeg', 'cardamom', 'ginger'] },
  { category: 'Sweet',      color: TAG_PALETTE[4],  notes: ['caramel', 'brown sugar', 'honey', 'maple', 'vanilla', 'molasses', 'toffee', 'butterscotch'] },
  { category: 'Nutty',      color: TAG_PALETTE[11], notes: ['hazelnut', 'almond', 'peanut', 'walnut', 'pecan', 'macadamia'] },
  { category: 'Cocoa',      color: TAG_PALETTE[10], notes: ['dark chocolate', 'milk chocolate', 'cocoa', 'bittersweet', 'cacao'] },
  { category: 'Roasted',    color: TAG_PALETTE[10], notes: ['tobacco', 'smoky', 'ashy', 'malt', 'cereal', 'toasted', 'burnt sugar', 'cedar'] },
]

// Flat lookup of all SCA notes → their color
const SCA_FLAT = SCA_FLAVORS.flatMap(cat => cat.notes.map(note => ({ label: note, color: cat.color })))

// Accepts string[] (legacy) or { label, color }[] — normalises internally
function normalise(items) {
  return items.map(item =>
    typeof item === 'string'
      ? { label: item, color: TAG_PALETTE[11] }
      : item
  )
}

export default function TagInput({ label, value = [], onChange }) {
  const [input, setInput] = useState('')
  const [openCategory, setOpenCategory] = useState(null)
  const [acIdx, setAcIdx] = useState(-1)
  const [pickerIdx, setPickerIdx] = useState(null)
  const inputRef = useRef()
  const containerRef = useRef()

  const tags = normalise(value)

  const suggestions = input.trim().length > 0
    ? SCA_FLAT.filter(s => s.label.includes(input.trim().toLowerCase()) && !tags.some(t => t.label === s.label)).slice(0, 6)
    : []

  // Close dropdown + category panel on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAcIdx(-1)
        setPickerIdx(null)
        setInput('')
        setOpenCategory(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  })

  // Signal to parent Drawer that a local panel is open and should claim Escape
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (openCategory || pickerIdx !== null) {
      el.setAttribute('data-traps-escape', 'true')
    } else {
      el.removeAttribute('data-traps-escape')
    }
  }, [openCategory, pickerIdx])

  // Close local panels on Escape (runs after Drawer yields)
  useEffect(() => {
    if (!openCategory && pickerIdx === null) return
    function handleEscape(e) {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      if (openCategory) setOpenCategory(null)
      else if (pickerIdx !== null) setPickerIdx(null)
    }
    window.addEventListener('keydown', handleEscape, true)
    return () => window.removeEventListener('keydown', handleEscape, true)
  }, [openCategory, pickerIdx])

  function addTag(raw, color) {
    const lbl = raw.trim().toLowerCase()
    if (!lbl || tags.some(t => t.label === lbl)) { setInput(''); setAcIdx(-1); return }
    onChange([...tags, { label: lbl, color: color ?? TAG_PALETTE[11] }])
    setInput('')
    setAcIdx(-1)
  }

  function handleKeyDown(e) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAcIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setAcIdx(i => Math.max(i - 1, -1)); return }
      if (e.key === 'Escape')    { setAcIdx(-1); setInput(''); return }
      if ((e.key === 'Enter' || e.key === 'Tab') && acIdx >= 0) {
        e.preventDefault()
        const s = suggestions[acIdx]
        addTag(s.label, s.color)
        return
      }
    }
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); return }
    if (e.key === 'Escape') { setInput(''); return }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) onChange(tags.slice(0, -1))
  }

  function removeTag(idx) { onChange(tags.filter((_, i) => i !== idx)) }
  function setTagColor(idx, color) {
    onChange(tags.map((t, i) => i === idx ? { ...t, color } : t))
    setPickerIdx(null)
  }

  return (
    <div className="relative" ref={containerRef}>
      {label && <Label>{label}</Label>}
      <div
        className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg min-h-[42px]"
        style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', transition: 'border-color 0.15s', cursor: 'text' }}
        onClick={() => inputRef.current?.focus()}
        onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--color-roast)'}
        onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
      >
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="relative flex items-center gap-1 pl-1.5 pr-1.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: tag.color.bg, color: tag.color.text }}
          >
            {/* Color dot */}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setPickerIdx(pickerIdx === idx ? null : idx) }}
              className="w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer hover:scale-125 transition-transform"
              style={{ backgroundColor: tag.color.text, opacity: 0.6, border: 'none', padding: 0 }}
              aria-label="Change colour"
            />
            {tag.label}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(idx) }}
              className="leading-none cursor-pointer opacity-40 hover:opacity-100"
              style={{ background: 'none', border: 'none', padding: 0, color: 'inherit' }}
              aria-label={`Remove ${tag.label}`}
            >×</button>

            {/* Colour picker popover */}
            {pickerIdx === idx && (
              <div
                className="absolute z-30 p-2 rounded-lg flex flex-wrap gap-1.5"
                style={{ bottom: 'calc(100% + 6px)', left: 0, backgroundColor: '#fff', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(30,17,8,0.12)', width: '136px' }}
                onClick={e => e.stopPropagation()}
              >
                {[...SCA_FLAVORS.map(c => c.color), TAG_PALETTE[11]].map((c, ci) => (
                  <button
                    key={ci}
                    type="button"
                    onClick={e => { e.stopPropagation(); setTagColor(idx, c) }}
                    className="w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.bg, border: tag.color.bg === c.bg ? `2px solid ${c.text}` : `1.5px solid ${c.text}`, opacity: tag.color.bg === c.bg ? 1 : 0.7 }}
                    title={ci < SCA_FLAVORS.length ? SCA_FLAVORS[ci].category : 'Neutral'}
                  />
                ))}
              </div>
            )}
          </span>
        ))}

        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setAcIdx(-1) }}
          onKeyDown={handleKeyDown}
          onBlur={() => { /* handled by click-outside */ }}
          placeholder={tags.length === 0 ? 'Type to search flavors…' : ''}
          className="flex-1 min-w-[80px] text-xs outline-none bg-transparent"
          style={{ color: 'var(--color-espresso)' }}
          autoComplete="off"
        />
      </div>

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div
          className="absolute z-30 w-full rounded-lg py-1 mt-0.5"
          style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(30,17,8,0.10)' }}
        >
          {suggestions.map((s, i) => {
            const q = input.trim().toLowerCase()
            const idx = s.label.indexOf(q)
            return (
              <button
                key={s.label}
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag(s.label, s.color) }}
                className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: i === acIdx ? 'var(--color-cream)' : 'transparent' }}
                onMouseEnter={() => setAcIdx(i)}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color.text, opacity: 0.7 }} />
                <span style={{ color: 'var(--color-espresso)' }}>
                  {s.label.slice(0, idx)}
                  <strong>{s.label.slice(idx, idx + q.length)}</strong>
                  {s.label.slice(idx + q.length)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* SCA flavor wheel quick-add */}
      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-stone)' }}>Flavor wheel</p>
        <div className="flex flex-wrap gap-1.5">
          {SCA_FLAVORS.map(cat => (
            <div key={cat.category} className="relative">
              <button
                type="button"
                onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
                className="px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer"
                style={{ backgroundColor: cat.color.bg, color: cat.color.text, border: openCategory === cat.category ? `1.5px solid ${cat.color.text}` : '1.5px solid transparent' }}
              >
                {cat.category}
              </button>
              {openCategory === cat.category && (
                <div
                  className="absolute z-20 p-2 rounded-lg flex flex-wrap gap-1 min-w-[160px]"
                  style={{ top: 'calc(100% + 4px)', left: 0, backgroundColor: '#fff', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(30,17,8,0.12)' }}
                >
                  {cat.notes.filter(n => !tags.some(t => t.label === n)).map(note => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => { addTag(note, cat.color); setOpenCategory(null) }}
                      className="px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: cat.color.bg, color: cat.color.text }}
                    >
                      + {note}
                    </button>
                  ))}
                  {cat.notes.every(n => tags.some(t => t.label === n)) && (
                    <span className="text-xs" style={{ color: 'var(--color-stone)' }}>All added</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
