'use client'

// ⚠️ THROWAWAY DEMO — temporary page to evaluate adaptive-heading looks over the real
// collage art. Not part of the feature. Delete before merge. View at /<locale>/blend-demo.
//
// Two families on show:
//  • mix-blend modes (difference / exclusion / normal): per-RGB-channel → full-colour
//    result (the "muddy" mid-tones). Only works here because art + text share ONE
//    isolated stacking context (on the real site main's z-10 would block it).
//  • duotone: fills the glyphs with the slice of the collage directly behind them
//    (background-clip:text, aligned to the art), then an SVG filter does
//    grayscale → ink↔cream map. "invert" makes it READ as contrast (dark bg → cream
//    text, light bg → ink text) instead of camouflage. This does NOT use mix-blend,
//    so it is immune to the stacking-context problem.

import { useEffect, useRef, useState } from 'react'

const COLLAGE = '/SVG/background/background-collage.svg'

// rgb of the brand tokens (ink #323031, cream #fffce5), normalised to 0..1 for the filter.
const INK = { r: 50 / 255, g: 48 / 255, b: 49 / 255 }
const CREAM = { r: 255 / 255, g: 252 / 255, b: 229 / 255 }

const SAMPLES: { top: string; text: string }[] = [
  { top: '4%', text: 'Почему именно мы' },
  { top: '16%', text: 'Бразильский португальский' },
  { top: '30%', text: 'Сравнение' },
  { top: '44%', text: 'Наши преподаватели' },
  { top: '58%', text: 'CELPE-BRAS' },
  { top: '72%', text: 'Тарифы' },
  { top: '86%', text: 'Запишись на урок' },
]

type Mode = 'difference' | 'exclusion' | 'normal' | 'duotone'
const MODES: Mode[] = ['difference', 'exclusion', 'normal', 'duotone']
const COLORS: { label: string; value: string }[] = [
  { label: 'white', value: '#ffffff' },
  { label: 'ink', value: '#323031' },
  { label: 'cream', value: '#fffce5' },
]

export default function BlendDemo() {
  const [mode, setMode] = useState<Mode>('duotone')
  const [color, setColor] = useState('#ffffff')
  const [invert, setInvert] = useState(true) // duotone: dark bg → cream (readable)
  const [tight, setTight] = useState(12) // ramp tightness: 1 = smooth, higher = harder soft-threshold
  const [mid, setMid] = useState(0.5) // midpoint: background luminance where ink↔cream flips
  const stageRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // Measure the art stage so duotone glyphs can sample the collage slice behind them.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const apply = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // duotone stops: invert => gray 0 (dark bg) maps to cream, gray 1 (light bg) to ink.
  const lo = invert ? CREAM : INK // value at grayscale 0
  const hi = invert ? INK : CREAM // value at grayscale 1

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--color-cream)' }}>
      {/* SVG duotone filter: grayscale (saturate 0) then map luminance to ink↔cream. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="duotone" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          {/* tighten the ramp: steepen contrast around `mid` => soft threshold.
              out = tight*(in - mid) + 0.5, clamped; transition width ≈ 1/tight. */}
          <feComponentTransfer>
            <feFuncR type="linear" slope={tight} intercept={0.5 - tight * mid} />
            <feFuncG type="linear" slope={tight} intercept={0.5 - tight * mid} />
            <feFuncB type="linear" slope={tight} intercept={0.5 - tight * mid} />
          </feComponentTransfer>
          {/* map the (now tightened) grayscale onto the ink↔cream axis */}
          <feComponentTransfer>
            <feFuncR type="table" tableValues={`${lo.r} ${hi.r}`} />
            <feFuncG type="table" tableValues={`${lo.g} ${hi.g}`} />
            <feFuncB type="table" tableValues={`${lo.b} ${hi.b}`} />
          </feComponentTransfer>
        </filter>
      </svg>

      {/* Controls — fixed, OUTSIDE the isolated stage. */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 12,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.92)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 700 }}>adaptive heading demo</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 320 }}>
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={btn(mode === m)}
            >
              {m}
            </button>
          ))}
        </div>
        {mode === 'duotone' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={invert} onChange={e => setInvert(e.target.checked)} />
              invert (readable contrast)
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>ramp:</span>
              {[1, 3, 6, 12].map(k => (
                <button key={k} onClick={() => setTight(k)} style={btn(tight === k)}>
                  {k === 1 ? 'smooth' : `×${k}`}
                </button>
              ))}
            </div>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              midpoint
              <input
                type="range"
                min={0.2}
                max={0.8}
                step={0.02}
                value={mid}
                onChange={e => setMid(parseFloat(e.target.value))}
              />
              <span>{mid.toFixed(2)}</span>
            </label>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            {COLORS.map(c => (
              <button key={c.value} onClick={() => setColor(c.value)} style={btn(color === c.value)}>
                {c.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ color: '#666' }}>
          {mode === 'duotone'
            ? `duotone ink↔cream · invert: ${invert} · ramp ${tight === 1 ? 'smooth' : '×' + tight} · mid ${mid.toFixed(2)}`
            : `text: ${color} · blend: ${mode}`}
        </div>
      </div>

      {/* Isolated stage: art + (blend-mode) text composite here. */}
      <div ref={stageRef} style={{ position: 'relative', isolation: 'isolate', width: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={COLLAGE} alt="" style={{ display: 'block', width: '100%', height: 'auto' }} />

        <div style={{ position: 'absolute', inset: 0 }}>
          {SAMPLES.map((s, i) => {
            const topPx = (parseFloat(s.top) / 100) * size.h
            const common: React.CSSProperties = {
              position: 'absolute',
              top: s.top,
              left: 0,
              right: 0,
              margin: 0,
              textAlign: 'center',
              fontSize: 'clamp(36px, 5vw, 80px)',
              lineHeight: 1.1,
            }
            const style: React.CSSProperties =
              mode === 'duotone'
                ? {
                    ...common,
                    color: 'transparent',
                    backgroundImage: `url(${COLLAGE})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${size.w}px ${size.h}px`,
                    backgroundPosition: `0px -${topPx}px`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    filter: 'url(#duotone)',
                  }
                : { ...common, color, mixBlendMode: mode }
            return (
              <h2 key={i} className="font-heading font-bold" style={style}>
                {s.text}
              </h2>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function btn(active: boolean): React.CSSProperties {
  return {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: active ? '#323031' : '#fff',
    color: active ? '#fff' : '#323031',
    cursor: 'pointer',
  }
}
