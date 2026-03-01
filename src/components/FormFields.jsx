// Shared form field primitives for consistent styling

const base = {
  border: '1px solid var(--color-border)',
  backgroundColor: '#fff',
  color: 'var(--color-espresso)',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const focusStyle = { borderColor: 'var(--color-roast)' }

// Thin label above each field
export function Label({ children, required }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-stone)' }}>
      {children}{required && <span style={{ color: 'var(--color-roast)' }}> *</span>}
    </label>
  )
}

export function Input({ label, required, ...props }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <input
        style={{ ...base, padding: '0.5rem 0.75rem' }}
        onFocus={e => Object.assign(e.target.style, focusStyle)}
        onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
        required={required}
        {...props}
      />
    </div>
  )
}

export function Textarea({ label, rows = 4, ...props }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <textarea
        rows={rows}
        style={{ ...base, padding: '0.5rem 0.75rem', resize: 'vertical' }}
        onFocus={e => Object.assign(e.target.style, focusStyle)}
        onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
        {...props}
      />
    </div>
  )
}

export function Select({ label, required, children, ...props }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <select
        style={{ ...base, padding: '0.5rem 0.75rem', cursor: 'pointer' }}
        onFocus={e => Object.assign(e.target.style, focusStyle)}
        onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
        required={required}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

// 2-column grid wrapper
export function FieldRow({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

// Section divider inside a form
export function FieldSection({ title }) {
  return (
    <div className="pt-2 pb-1">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-stone)' }}>
        {title}
      </p>
    </div>
  )
}
