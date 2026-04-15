'use client'

interface Props {
  ctaText:   string
  className?: string
  style?:    React.CSSProperties
}

export default function FreeLessonButton({ ctaText, className, style }: Props) {
  const handleClick = () => {
    const el = document.getElementById('tutors')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={style}
    >
      {ctaText}
    </button>
  )
}
