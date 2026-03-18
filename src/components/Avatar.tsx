export default function Avatar({ src, name, size = 36, colorIndex = 0 }: { src?: string | null; name: string; size?: number; colorIndex?: number }) {
  const AVATAR_COLORS = ['#007AFF', '#5856D6', '#0EA572', '#E8882C', '#DC3545']
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  const fontSize = Math.round(size * 0.35)
  const radius = size >= 40 ? 'rounded-2xl' : size >= 28 ? 'rounded-xl' : 'rounded-lg'

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`object-cover flex-shrink-0 ${radius}`}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 text-white font-bold ${radius}`}
      style={{ width: size, height: size, background: color, fontSize }}
    >
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}
