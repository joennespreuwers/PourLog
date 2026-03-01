const FILLED = '★'
const EMPTY = '☆'

export default function StarRating({ value, max = 5, size = 'sm' }) {
  const textSize = size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={`${textSize} tracking-tight`} aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'text-roast' : 'text-border'}>
          {i < value ? FILLED : EMPTY}
        </span>
      ))}
    </span>
  )
}
