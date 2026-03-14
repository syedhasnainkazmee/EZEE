type Props = {
  height?: number
  className?: string
}

export default function ProcessLogo({ height = 22, className = '' }: Props) {
  return (
    <img
      src="/uploads/Logo.png.png"
      alt="Process"
      height={height}
      style={{ height: `${height}px`, width: 'auto', display: 'block' }}
      className={className}
      draggable={false}
    />
  )
}
