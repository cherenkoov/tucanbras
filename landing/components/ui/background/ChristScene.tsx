'use client'

import { useEffect, useRef } from 'react'
import { useStatueRotation } from './useStatueRotation'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

// ─── Scene dimensions (Figma canvas) ─────────────────────────────────────────
const W = 580
const H = 660

// Geometry BackgroundCanvas needs to seat the statue on the peak. Exported (not copied)
// so the seating can never drift out of sync with the art below: the scene box has a
// TRANSPARENT GAP under the pedestal (the pedestal ends at PEDESTAL_TOP+PEDESTAL_H = 643
// of 660), so anchoring the scene BOX to the crest would float the statue by that gap.
// The gap scales with the box (which is sized off the viewport, on a different curve than
// the mountain), so it must be compensated — see STATUE_SEAT_FRACTION in BackgroundCanvas.
export const CHRIST_SCENE = {
  W,
  H,
  // width: clamp(MIN_W, VW vw, MAX_W) — keep in sync with the wrapper style below.
  MIN_W: 234,
  VW: 27,
  MAX_W: 522,
  PEDESTAL_TOP: 493,
  PEDESTAL_H: 150,
} as const

/** Rendered height of the scene box at a given viewport width (CSS px, pre-scaleY). */
export function christBoxHeight(viewportW: number): number {
  const w = Math.min(Math.max(CHRIST_SCENE.MIN_W, (CHRIST_SCENE.VW / 100) * viewportW), CHRIST_SCENE.MAX_W)
  return w * (CHRIST_SCENE.H / CHRIST_SCENE.W)
}

// ─── Stars: [left%, top%, duration_s, delay_s, size_px] ─────────────────────
// Positions from Figma metadata (group offset x=79.42, y=7.96 already applied,
// then converted to % of 580×660 scene canvas).
const STARS: [number, number, number, number, number][] = [
  [60.4, 1.2,  2.3, 0.0, 31], // Star 01
  [28.8, 30.2, 2.8, 0.5, 31], // Star 02
  [13.7, 24.8, 1.9, 0.9, 31], // Star 03
  [34.9, 5.1,  2.6, 1.3, 31], // Star 04
  [65.5, 31.0, 3.1, 0.2, 31], // Star 05
  [25.1, 9.2,  2.1, 0.7, 22], // Star 06
  [64.3, 7.4,  2.7, 1.1, 22], // Star 07
  [31.5, 47.1, 2.0, 0.4, 22], // Star 08
  [65.4, 49.3, 3.2, 0.8, 22], // Star 09
  [84.2, 23.3, 2.4, 1.5, 22], // Star 10
]

const BASE = '/SVG/background/Jesus statue'

export default function ChristScene() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sceneRef   = useRef<HTMLDivElement>(null)
  const statueRef  = useRef<HTMLDivElement>(null)
  const starsRef   = useRef<HTMLDivElement>(null)

  useStatueRotation(statueRef)

  useScrollAnimation({
    ref: starsRef,
    maxDegrees: 18,
    decay: 0.88,
    velocitySensitivity: 0.22,
    setup: (el) => (target) => {
      el.style.transform = `translateY(${target}px)`
    },
  })

  // Proportional scale: scene is always W×H internally;
  // wrapper uses clamp → ResizeObserver drives scale(ratio)
  useEffect(() => {
    const wrapper = wrapperRef.current
    const scene   = sceneRef.current
    if (!wrapper || !scene) return
    const obs = new ResizeObserver(([entry]) => {
      scene.style.transform = `scale(${entry.contentRect.width / W})`
    })
    obs.observe(wrapper)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={wrapperRef}
      style={{
        width: `clamp(${CHRIST_SCENE.MIN_W}px, ${CHRIST_SCENE.VW}vw, ${CHRIST_SCENE.MAX_W}px)`,
        aspectRatio: `${W} / ${H}`,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Inner scene — always W×H, scaled down to wrapper size */}
      <div
        ref={sceneRef}
        className="select-none pointer-events-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: W,
          height: H,
          transformOrigin: 'top left',
        }}
      >
        {/* ── Stars ── float CSS + scroll-velocity translateY via starsRef ── */}
        <div
          ref={starsRef}
          style={{ position: 'absolute', inset: 0 }}
        >
          {STARS.map(([left, top, dur, delay, size], i) => (
            <img
              key={i}
              src={`${BASE}/Star ${String(i + 1).padStart(2, '0')}.svg`}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: 'auto',
                animation: `starFloat ${dur}s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* ── Statue wrapper — Figma bounds: left=32, top=8, 516×505 ── */}
        <div
          style={{
            position: 'absolute',
            left: 32,
            top: 8,
            width: 516,
            height: 505,
          }}
        >
          {/* Statue — 3D mouse-tracked */}
          <div
            ref={statueRef}
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: 'center 96%',
              willChange: 'transform',
            }}
          >
            <img
              src={`${BASE}/statue.svg`}
              alt="Христос-Искупитель"
              draggable={false}
              style={{ width: 516, height: 505, display: 'block' }}
            />
          </div>
        </div>

        {/* ── Pedestal (static) — Figma: left=202, top=493 in scene ── */}
        <img
          src={`${BASE}/pedestal.svg`}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            left: 202,
            top: CHRIST_SCENE.PEDESTAL_TOP,
            width: 185,
            height: CHRIST_SCENE.PEDESTAL_H,
          }}
        />
      </div>
    </div>
  )
}
