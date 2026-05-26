'use client'

import { useEffect, type RefObject } from 'react'

const SVG_W = 800

// Train visual bounding box in SVG user units
const TRAIN = { x: 327, y: 873, w: 110, h: 120 } as const

// Rail path in SVG user units (from injectRailPath)
const RAIL_PATH =
  'M599 569.5 C508.409 575.972 466.872 580.723 373 605 ' +
  'C361.167 608.833 331.7 621.7 338.5 636.5 ' +
  'C347 655 388 681 414.5 690 ' +
  'C441 699 525.5 733 543.5 752 ' +
  'C554.374 763.478 564.5 785.5 543.5 814.5 ' +
  'C526.7 837.7 441.5 905.167 401 936 ' +
  'L256 1045.5 L63 1176.5'

const KEYFRAME_ID = 'train-overlay-kf'

function scalePath(d: string, s: number): string {
  return d.replace(/-?\d+(?:\.\d+)?/g, n => (parseFloat(n) * s).toFixed(2))
}

function ensureKeyframes() {
  if (document.getElementById(KEYFRAME_ID)) return
  const st = document.createElement('style')
  st.id = KEYFRAME_ID
  st.textContent = '@keyframes train-along{from{offset-distance:0%}to{offset-distance:100%}}'
  document.head.appendChild(st)
}

export function useTrainAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    ensureKeyframes()

    const el = container   // narrowed non-null reference for nested functions

    // Hide original train in main SVG — overlay takes over
    const origTrain = el.querySelector<Element>('#train')
    if (origTrain) (origTrain as SVGElement).style.visibility = 'hidden'

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', `${TRAIN.x} ${TRAIN.y} ${TRAIN.w} ${TRAIN.h}`)
    svg.setAttribute('overflow', 'visible')

    if (origTrain) {
      const clone = origTrain.cloneNode(true) as Element
      clone.removeAttribute('id')
      clone.querySelectorAll('[id]').forEach(el2 => el2.removeAttribute('id'))
      svg.appendChild(clone)
    }

    svg.style.cssText =
      'position:absolute;top:0;left:0;pointer-events:none;' +
      'animation:train-along 8s linear infinite paused;' +
      'visibility:hidden;'
    svg.style.setProperty('offset-anchor', '50% 50%')
    svg.style.setProperty('offset-rotate', 'auto')
    el.appendChild(svg)

    function applyScale() {
      const s = el.offsetWidth / SVG_W
      svg.style.width  = `${(TRAIN.w * s).toFixed(1)}px`
      svg.style.height = `${(TRAIN.h * s).toFixed(1)}px`
      svg.style.setProperty('offset-path', `path('${scalePath(RAIL_PATH, s)}')`)
    }
    applyScale()

    const ro = new ResizeObserver(() => applyScale())
    ro.observe(el)

    const sentinel = document.createElement('div')
    sentinel.style.cssText = 'position:absolute;top:25%;left:0;width:100%;height:35%;pointer-events:none;'
    el.appendChild(sentinel)

    let revealed = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!revealed) {
            revealed = true
            svg.style.visibility = ''
          }
          svg.style.animationPlayState = 'running'
        } else {
          svg.style.animationPlayState = 'paused'
        }
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0 }
    )
    observer.observe(sentinel)

    return () => {
      svg.remove()
      sentinel.remove()
      ro.disconnect()
      observer.disconnect()
      if (origTrain) (origTrain as SVGElement).style.visibility = ''
    }
  }, [enabled, containerRef])
}
