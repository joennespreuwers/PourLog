export default function EmptyState({ icon, title, description, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      {icon && (
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
          style={{ backgroundColor: 'var(--color-cream)', border: '1px solid var(--color-border)' }}
        >
          {icon}
        </div>
      )}
      <h2 className="font-serif text-2xl font-medium mb-2" style={{ color: 'var(--color-espresso)' }}>
        {title}
      </h2>
      {description && (
        <p className="text-sm max-w-xs leading-relaxed mb-8" style={{ color: 'var(--color-stone)' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}
        >
          {action}
        </button>
      )}
    </div>
  )
}
