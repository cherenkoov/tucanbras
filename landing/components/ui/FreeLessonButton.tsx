'use client'

import { scrollToElement } from '@/components/ui/AnchorScrollHandler'

interface Props {
  ctaText:   string
  className?: string
  style?:    React.CSSProperties
}

export default function FreeLessonButton({ ctaText, className, style }: Props) {
  const handleClick = () => {
    const el = document.getElementById('tutors')
    if (el) scrollToElement(el)
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
