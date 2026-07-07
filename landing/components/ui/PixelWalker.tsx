'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { gait } from './background/humanMotion'

interface PixelWalkerProps {
  src: string
  width: number
  height: number
  /** Base horizontal facing of the source art: +1 if it faces right, -1 if left. */
  faceSign?: 1 | -1
  /** Per-walker pace multiplier — larger = slower overall. Also desyncs two walkers. */
  pace?: number
  /** Lap phase offset in [0,1) so two walkers don't start in lockstep. */
  phase?: number
  /** Minimum lane width (px) so a long sibling title can't collapse the walk area. */
  minLane?: number
}

const FACING_EPS = 0.08 // |velocity| deadzone (fraction) where facing is held at a turn
const MIN_PERIOD = 4.5 // s — floor so even a narrow lane paces slowly, never twitchy

// Lap duration (one there-and-back) as a function of available travel. Super-linear in
// `travel` so a WIDER lane paces SLOWER (lower px/s), per design; floored by MIN_PERIOD so
// narrow lanes are calm too. Travel is clamped so huge lanes don't crawl to a halt.
function lapPeriod(travel: number, pace: number): number {
  const t = Math.min(900, Math.max(60, travel))
  return Math.max(MIN_PERIOD, pace * (t / 120) ** 1.2)
}

// A pixel-art mascot that paces left↔right across the free space its flex lane is given.
// The lane (flex-1) only occupies the room the sibling title leaves, so the walk can never
// overlap the text; travel is clamped to the lane so it never leaves the block.
export default function PixelWalker({
  src,
  width,
  height,
  faceSign = 1,
  pace = 2.4,
  phase = 0,
  minLane = 160,
}: PixelWalkerProps) {
  const laneRef = useRef<HTMLDivElement>(null)
  const pixelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const lane = laneRef.current
    const pixel = pixelRef.current
    if (!lane || !pixel) return

    pixel.style.transformOrigin = 'bottom center'

    // Available horizontal travel = lane width minus the mascot's own width. Recomputed on
    // resize and reacts to locale-dependent title widths (a longer title shrinks the lane).
    let travel = Math.max(0, lane.offsetWidth - pixel.offsetWidth)
    const ro = new ResizeObserver(() => {
      travel = Math.max(0, lane.offsetWidth - pixel.offsetWidth)
    })
    ro.observe(lane)

    let lastFacing: 1 | -1 = faceSign
    // Ping-pong phase, integrated over time so period can change with lane width (on resize)
    // without teleporting; gait/hop use raw elapsed time.
    let theta = phase * 2 * Math.PI
    const startTime = performance.now()
    let lastT = startTime

    const renderFrame = (now: number) => {
      const dt = (now - lastT) / 1000
      lastT = now
      const elapsedSec = (now - startTime) / 1000
      theta += (2 * Math.PI * dt) / lapPeriod(travel, pace)

      const u = (1 - Math.cos(theta)) / 2 // 0..1 eased ping-pong
      const x = travel * u
      const vel = Math.sin(theta) // sign = travel direction (right when > 0)

      const dir: 1 | -1 = vel > FACING_EPS ? 1 : vel < -FACING_EPS ? -1 : lastFacing
      lastFacing = dir

      const { sx, sy } = gait(elapsedSec, 0.06, 0.05, 8, phase) // subtle squash/stretch
      const hopY = -Math.abs(Math.sin(elapsedSec * 8 + phase * Math.PI * 2)) * (height * 0.04)

      pixel.style.transform =
        `translate(${x.toFixed(2)}px, ${hopY.toFixed(2)}px) ` +
        `scaleX(${(faceSign * dir * sx).toFixed(4)}) scaleY(${sy.toFixed(4)})`
    }

    // Reduced motion: rest at the right edge (matches the original pinned-right layout).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pixel.style.transform = `translate(${travel.toFixed(2)}px, 0px) scaleX(${faceSign})`
      return () => ro.disconnect()
    }

    let running = false
    const tick = () => renderFrame(performance.now())

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true
          lastT = performance.now() // reset dt clock so a long pause doesn't jump the phase
          gsap.ticker.add(tick)
        } else if (!entry.isIntersecting && running) {
          running = false
          gsap.ticker.remove(tick)
        }
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0 },
    )
    io.observe(lane)

    return () => {
      if (running) gsap.ticker.remove(tick)
      io.disconnect()
      ro.disconnect()
      pixel.style.transform = ''
    }
  }, [faceSign, pace, phase, height])

  return (
    <div ref={laneRef} className="relative flex-1" style={{ height, minWidth: minLane }}>
      <div
        ref={pixelRef}
        className="absolute left-0 top-0 h-full flex items-center will-change-transform"
      >
        <img
          src={src}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          className="pointer-events-none select-none"
          style={{ width, height, objectFit: 'contain' }}
        />
      </div>
    </div>
  )
}
