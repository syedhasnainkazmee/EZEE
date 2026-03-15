type Props = {
  height?: number
  className?: string
  variant?: 'black' | 'white'
}

export default function ProcessLogo({ height = 22, className = '', variant = 'black' }: Props) {
  const src = variant === 'white' ? '/WhiteLogo.png' : '/BlackLogo.png'
  return (
    <img
      src={src}
      alt="EZEE"
      height={height}
      style={{ height: `${height}px`, width: 'auto', display: 'block' }}
      className={className}
      draggable={false}
    />
  )
}
