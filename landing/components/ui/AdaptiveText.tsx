import type { CSSProperties, ElementType, ReactNode } from 'react'

// Section headings and pull-quotes that sit DIRECTLY on the background collage (no card
// under them). They used to run an adaptive duotone — the glyphs sampled the background
// behind them and resolved to one of two brand colours depending on its luminance.
// That whole machine was removed 2026-10-03 by the owner's call («убрать дуотон у
// текстов и сделать только зелёным»): one flat brand green everywhere, so a heading
// reads the same whatever the collage is doing behind it.
//
// Nothing adaptive is left, so this is a plain server component: no hook, no SVG filter,
// no backdrop-filter overlay and no per-glyph mask. Kept as a component rather than
// inlined at the call sites so the heading colour stays one edit.
const TEXT_COLOR = 'var(--color-green)'

interface AdaptiveTextProps {
  as?: ElementType
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export default function AdaptiveText({ as: Tag = 'p', className, style, children }: AdaptiveTextProps) {
  // `style` first: a call site that passes its own colour still wins.
  return <Tag className={className} style={{ color: TEXT_COLOR, ...style }}>{children}</Tag>
}
