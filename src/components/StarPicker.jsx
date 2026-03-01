// Clickable star rating picker for forms
export default function StarPicker({ value, onChange, max = 5, label = 'Rating' }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-stone)' }}>
          {label}
        </label>
      )}
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => {
          const starVal = i + 1
          const filled = starVal <= (value ?? 0)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(starVal === value ? null : starVal)}
              className="text-2xl leading-none cursor-pointer transition-transform hover:scale-110"
              style={{ color: filled ? 'var(--color-roast)' : 'var(--color-border)', background: 'none', border: 'none', padding: 0 }}
              aria-label={`${starVal} star${starVal !== 1 ? 's' : ''}`}
            >
              {filled ? '★' : '☆'}
            </button>
          )
        })}
        {value != null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs ml-2 self-center cursor-pointer"
            style={{ color: 'var(--color-stone)', background: 'none', border: 'none', padding: 0 }}
          >
            clear
          </button>
        )}
      </div>
    </div>
  )
}
