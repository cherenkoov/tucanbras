'use client'

import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { HUMANS } from './humanPaths'
import { progressFor, facingFor, gait, zForProgress } from './humanMotion'

const SVG_W = 800
const SVG_H = 2047
const NS = 'http://www.w3.org/2000/svg'
const FACING_EPS = 0.4 // canvas units of tangent dx below which facing is held
const TANGENT_AHEAD = 3 // lookahead length (canvas units) for the tangent

export function useHumanAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  humanRefs: RefObject<HTMLDivElement | null>[],
  { enabled, debug = false }: { enabled: boolean; debug?: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    // Hidden measuring SVG holding the 4 track paths (geometry only).
    const measure = document.createElementNS(NS, 'svg')
    measure.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`)
    // NOTE: must stay laid-out (not width:0 / display:none) — some browsers return 0
    // from getTotalLength/getPointAtLength on an unrendered path. Full size + opacity:0.
    measure.style.cssText = debug
      ? 'position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:9;overflow:visible;'
      : 'position:absolute;top:0;left:0;width:100%;opacity:0;pointer-events:none;overflow:visible;'

    const paths: SVGPathElement[] = HUMANS.map((h) => {
      const p = document.createElementNS(NS, 'path')
      p.setAttribute('d', h.d)
      if (debug) {
        p.setAttribute('fill', 'none')
        p.setAttribute('stroke', '#31B93A')
        p.setAttribute('stroke-width', '1.5')
      }
      measure.appendChild(p)
      return p
    })

    if (debug) {
      // Dots at each toggle-range boundary, to eyeball thresholds against the art.
      HUMANS.forEach((h, i) => {
        const total = paths[i].getTotalLength()
        h.layerToggles.forEach((t) => {
          t.range.forEach((r, j) => {
            const pt = paths[i].getPointAtLength((r % 1) * total)
            const dot = document.createElementNS(NS, 'circle')
            dot.setAttribute('cx', String(pt.x))
            dot.setAttribute('cy', String(pt.y))
            dot.setAttribute('r', '4')
            dot.setAttribute('fill', j === 0 ? '#0000FF' : '#FF0000')
            measure.appendChild(dot)
          })
        })
      })
    }

    container.appendChild(measure)

    const totals = paths.map((p) => p.getTotalLength())
    const starts = paths.map((p) => p.getPointAtLength(0))

    // Per-figure transform-origin = feet (bbox bottom-center of the figure <g>), in %.
    const els = humanRefs.map((r) => r.current)
    els.forEach((el, i) => {
      if (!el) return
      const g = el.querySelector<SVGGElement>('g')
      if (!g) return
      const bb = g.getBBox()
      const cx = ((bb.x + bb.width / 2) / SVG_W) * 100
      const by = ((bb.y + bb.height) / SVG_H) * 100
      el.style.transformOrigin = `${cx.toFixed(2)}% ${by.toFixed(2)}%`
      el.style.willChange = 'transform'
      el.style.zIndex = String(HUMANS[i].baseZ)
    })

    // Cached scale (canvas unit -> screen px), refreshed on resize.
    let scale = container.offsetWidth / SVG_W
    const ro = new ResizeObserver(() => {
      scale = container.offsetWidth / SVG_W
    })
    ro.observe(container)

    const lastFacing: (1 | -1)[] = HUMANS.map(() => 1)

    const renderFrame = (elapsedSec: number) => {
      els.forEach((el, i) => {
        if (!el) return
        const cfg = HUMANS[i]
        const prog = progressFor(elapsedSec, cfg.lap, cfg.phase)
        const len = prog * totals[i]
        const p = paths[i].getPointAtLength(len)
        const ahead = paths[i].getPointAtLength((len + TANGENT_AHEAD) % totals[i])
        const ox = cfg.offset?.x ?? 0
        const oy = cfg.offset?.y ?? 0
        const dx = (p.x - starts[i].x + ox) * scale
        const dy = (p.y - starts[i].y + oy) * scale
        const facing = facingFor(ahead.x - p.x, lastFacing[i], FACING_EPS)
        lastFacing[i] = facing
        const { sx, sy } = gait(elapsedSec, cfg.A, cfg.B, cfg.omega, cfg.phase)
        const scaleX = cfg.faceSign * facing * sx
        el.style.transform =
          `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) ` +
          `scaleX(${scaleX.toFixed(4)}) scaleY(${sy.toFixed(4)})`
        el.style.zIndex = String(zForProgress(prog, cfg.baseZ, cfg.layerToggles))
      })
    }

    // Reduced motion: static first frame (progress 0), correct z, no ticker.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      renderFrame(0)
      return () => {
        measure.remove()
        ro.disconnect()
      }
    }

    const startTime = performance.now()
    let running = false
    const tick = () => {
      renderFrame((performance.now() - startTime) / 1000)
    }

    // Pause/resume the ticker when the human band scrolls out of view.
    // Tracks span y≈1124–1564 of 2047 → ~55–76% of the canvas height.
    const sentinel = document.createElement('div')
    sentinel.style.cssText =
      'position:absolute;top:54%;left:0;width:100%;height:23%;pointer-events:none;'
    container.appendChild(sentinel)

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true
          gsap.ticker.add(tick)
        } else if (!entry.isIntersecting && running) {
          running = false
          gsap.ticker.remove(tick)
        }
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0 }
    )
    io.observe(sentinel)

    return () => {
      if (running) gsap.ticker.remove(tick)
      io.disconnect()
      ro.disconnect()
      sentinel.remove()
      measure.remove()
      els.forEach((el) => {
        if (el) el.style.transform = ''
      })
    }
  }, [enabled, debug, containerRef, humanRefs])
}
