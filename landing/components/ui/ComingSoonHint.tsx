'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'

/**
 * Wraps a disabled control and reveals a small chip with a hint (e.g. "coming soon"):
 *  - mouse: chip appears at the cursor and follows it while the pointer stays over the zone
 *  - touch/pen: chip appears at the tap point, auto-dismissing after 900ms (no hover)
 *
 * Chip visuals + cursor-follow mirror the Tutors cursor chip — cream pill, ink text,
 * btn shadow, centred on the pointer. The wrapper catches the pointer; the dimmed
 * children keep their own opacity so only the icon/label is muted, never the chip.
 */
export default function ComingSoonHint({
  label,
  className = '',
  style,
  children,
}: {
  label: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }
  useEffect(() => clear, [])

  // Pointer position relative to the wrapper's box.
  const at = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <span
      className={`relative cursor-default ${className}`}
      style={style}
      onPointerEnter={e => { if (e.pointerType === 'mouse') { clear(); at(e); setOpen(true) } }}
      onPointerMove={e => { if (e.pointerType === 'mouse') at(e) }}
      onPointerLeave={e => { if (e.pointerType === 'mouse') { clear(); setOpen(false) } }}
      // Touch has no hover: flash the chip at the tap point, then auto-hide after 900ms.
      onPointerDown={e => {
        if (e.pointerType === 'mouse') return
        clear()
        at(e)
        setOpen(true)
        timer.current = setTimeout(() => setOpen(false), 900)
      }}
    >
      {children}
      <span
        role="tooltip"
        aria-hidden={!open}
        className="pointer-events-none absolute z-[30] whitespace-nowrap rounded-[66px] px-[20px] py-[10px] font-sans font-bold transition-opacity duration-150"
        style={{
          left: pos.x,
          top: pos.y,
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--color-cream)',
          color: 'var(--color-ink)',
          fontSize: '15px',
          lineHeight: '1',
          boxShadow: 'var(--shadow-btn)',
          opacity: open ? 1 : 0,
        }}
      >
        {label}
      </span>
    </span>
  )
}
