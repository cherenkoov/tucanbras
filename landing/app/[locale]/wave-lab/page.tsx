'use client'

// ⚠️ THROWAWAY DEV LAB — isolated page to iterate the beach SURF animation in isolation
// (no header/footer/collage). View at /<locale>/wave-lab (e.g. /en/wave-lab). Delete before merge.
//
// Renders the beach SVG with the EXACT same prep the real site uses
// (prepareBeachSvg → injectWaveSurfAnimation) at real width, then jumps to the sea at the
// bottom of the tall (1027×3614) scene. The background behind the SVG is switchable so gaps
// are diagnosable: `ground` = the real z8 brown, `sea` = a wave-blue backdrop, `debug` =
// magenta (any gap screams). HMR reflects edits to beachWaves.ts live.

import { useEffect, useMemo, useRef, useState } from 'react'
import { prepareBeachSvg, BEACH_GROUND_COLOR } from '@/components/ui/background/prepareBeachSvg'
import { injectWaveSurfAnimation } from '@/components/ui/background/beachWaves'
import { loadOceanWaveShapes, type OceanWaveShape } from '@/components/ui/background/oceanWaves'
import { useWaveDepthOrder } from '@/components/ui/background/useWaveDepthOrder'

const BEACH_SVG = '/SVG/background/main%202.svg'

type Bg = 'ground' | 'sea' | 'debug'
const BG_COLORS: Record<Bg, string> = {
  ground: BEACH_GROUND_COLOR, // #77533E — what the real site shows behind the beach (z8)
  sea: '#2982B6',             // a wave-blue, to preview a solid sea backdrop
  debug: '#ff00ff',           // magenta — any exposed gap is instantly visible
}

export default function WaveLab() {
  const [raw, setRaw] = useState('') // prepared (b2-prefixed) beach SVG, before wave injection
  const [shapes, setShapes] = useState<Record<string, OceanWaveShape> | null>(null)
  const [bg, setBg] = useState<Bg>('ground')
  const [widthPct, setWidthPct] = useState(100)  // SVG render width as % of viewport
  const [queueCount, setQueueCount] = useState(14) // waves in the conveyor queue
  const [drift, setDrift] = useState(370)          // one-way x drift amplitude per wave
  const [widthScale, setWidthScale] = useState(2.4) // wave width × viewBox
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(BEACH_SVG)
      .then(r => r.text())
      .then(text => setRaw(prepareBeachSvg(text)))
      .catch(err => console.error('wave-lab: beach SVG fetch failed', err))
    loadOceanWaveShapes()
      .then(setShapes)
      .catch(err => console.error('wave-lab: ocean waves fetch failed', err))
  }, [])

  // Re-inject when the queue count changes (live density tuning).
  const svg = useMemo(
    () => (raw && shapes ? injectWaveSurfAnimation(raw, { queueCount, drift, widthScale, shapes }) : ''),
    [raw, shapes, queueCount, drift, widthScale],
  )

  // Depth-order the queue (nearer-shore on top). Re-attach whenever the SVG re-injects.
  useWaveDepthOrder(scrollRef, svg)

  // Jump to the sea (bottom of the tall beach scene) once it renders / width changes.
  useEffect(() => {
    const el = scrollRef.current
    if (el && svg) el.scrollTop = el.scrollHeight
  }, [svg, widthPct])

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG_COLORS[bg], overflow: 'hidden' }}>
      <div ref={scrollRef} style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
        {svg && (
          <div
            style={{ width: `${widthPct}vw`, margin: '0 auto' }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>

      {/* Controls — fixed overlay */}
      <div
        style={{
          position: 'fixed', top: 10, left: 10, zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: 10, borderRadius: 10,
          background: 'rgba(0,0,0,0.72)', color: '#fff',
          font: '12px/1.4 ui-monospace, monospace',
        }}
      >
        <b>wave-lab · sea</b>
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.keys(BG_COLORS) as Bg[]).map(k => (
            <button key={k} onClick={() => setBg(k)} style={btn(bg === k)}>{k}</button>
          ))}
        </div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          width
          <input
            type="range" min={100} max={220} step={5}
            value={widthPct} onChange={e => setWidthPct(parseInt(e.target.value, 10))}
          />
          <span>{widthPct}vw</span>
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          queue
          <input
            type="range" min={1} max={20} step={1}
            value={queueCount} onChange={e => setQueueCount(parseInt(e.target.value, 10))}
          />
          <span>{queueCount} волн</span>
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          x-drift
          <input
            type="range" min={0} max={600} step={10}
            value={drift} onChange={e => setDrift(parseInt(e.target.value, 10))}
          />
          <span>{drift}px</span>
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          wave-w
          <input
            type="range" min={1.5} max={4} step={0.1}
            value={widthScale} onChange={e => setWidthScale(parseFloat(e.target.value))}
          />
          <span>×{widthScale.toFixed(1)}</span>
        </label>
        <div style={{ opacity: 0.7 }}>edge-safe if width ≳ 1 + drift/513</div>
      </div>
    </div>
  )
}

function btn(active: boolean): React.CSSProperties {
  return {
    padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid #666',
    background: active ? '#fff' : 'transparent',
    color: active ? '#000' : '#fff',
  }
}
