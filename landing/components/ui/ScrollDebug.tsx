'use client'

import { useEffect, useRef, useState } from 'react'

// Crash/paint probe (debug builds; inert without query params).
//
// ?debug=1     — fixed HUD: live scrollY + section under the viewport middle, persisted
//                to localStorage each frame. A mobile tab crash can't be caught from JS
//                (the OS kills the process), but the last persisted line survives it —
//                reopen after the crash and «†prev:» shows where the page died.
// ?probe=1     — paint-map badges every 500px of document height, in TWO paint
//                contexts: RED inside the content root (voids together with the failing
//                content subtree), BLACK directly on <body> (outside the root's
//                overflow:clip). Which set disappears below the void line tells which
//                subtree stops painting.
// ?noanim=1    — adds html.noanim (globals.css kills mix-blend-mode under it); the
//                scroll-driven JS animations check the param themselves.
// ?noabout=1   — replaces the #about content with an inert same-height grey block, to
//                bisect whether the paint stall lives inside About's content.
export default function ScrollDebug() {
  const [on, setOn] = useState(false)
  const [prev, setPrev] = useState('')
  const liveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)

    if (params.has('noanim')) document.documentElement.classList.add('noanim')

    if (params.has('noabout')) {
      const about = document.getElementById('about')
      if (about) {
        const h = Math.round(about.getBoundingClientRect().height)
        about.innerHTML =
          `<div style="height:${h}px;background:#e5e0c8;border-radius:38px;` +
          `display:flex;align-items:center;justify-content:center;font:16px monospace">` +
          `about placeholder ${h}px</div>`
      }
    }

    // Fine-grained About ablation (?ablate=cards|shadows|media, comma-separable):
    //  cards   — strip the glass surfaces (translucent bg + shadows) but keep content;
    //  shadows — strip only the box-shadows (incl. the full-interior inset one);
    //  media   — hide every <img>/<svg> inside About, keep the glass cards.
    const ablate = params.get('ablate')
    if (ablate) {
      const about = document.getElementById('about')
      if (about) {
        if (ablate.includes('cards')) {
          about.querySelectorAll<HTMLElement>('.glass').forEach(el => {
            el.classList.remove('glass')
            el.style.boxShadow = 'none'
            el.style.backgroundColor = 'transparent'
          })
        }
        if (ablate.includes('shadows')) {
          about.querySelectorAll<HTMLElement>('[style*="box-shadow"], .glass').forEach(el => {
            el.style.boxShadow = 'none'
          })
        }
        if (ablate.includes('media')) {
          about.querySelectorAll<HTMLElement>('img, svg').forEach(el => {
            el.style.display = 'none'
          })
        }
      }
    }

    if (params.has('probe')) {
      // Wait for layout to settle (fonts, images) before measuring the document.
      const t = setTimeout(() => {
        const docH = document.documentElement.scrollHeight
        const root = document.querySelector<HTMLElement>('main')
        const mk = (top: number, color: string, label: string) => {
          const d = document.createElement('div')
          d.textContent = label
          d.style.cssText =
            `position:absolute;top:${top}px;z-index:9998;pointer-events:none;` +
            `background:${color};color:#fff;font:11px/1 monospace;padding:3px 5px;border-radius:4px;`
          return d
        }
        for (let y = 0; y <= docH; y += 500) {
          // BLACK — on <body>, outside the content root's overflow:clip.
          const b = mk(y, 'rgba(0,0,0,0.85)', `b${y}`)
          b.style.left = '4px'
          document.body.appendChild(b)
          // RED — inside <main>, same paint subtree as the voiding content.
          if (root) {
            const rootTop = root.getBoundingClientRect().top + scrollY
            const r = mk(y - rootTop, 'rgba(180,30,30,0.9)', `r${y}`)
            r.style.left = '64px'
            root.appendChild(r)
          }
        }
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (!new URLSearchParams(location.search).has('debug')) return
    // Capture the previous session's last position BEFORE the live writes overwrite it.
    setPrev(localStorage.getItem('scroll-debug') ?? 'нет записи')
    setOn(true)

    let raf = 0
    const write = () => {
      raf = 0
      let cur = '—'
      document.querySelectorAll('section[id], header[id], footer[id]').forEach(s => {
        if (s.getBoundingClientRect().top <= innerHeight / 2) cur = s.id
      })
      const line = `y=${Math.round(scrollY)} @${cur} ${new Date().toLocaleTimeString()}`
      if (liveRef.current) liveRef.current.textContent = line
      try { localStorage.setItem('scroll-debug', line) } catch { /* quota/private mode */ }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(write) }
    write()
    addEventListener('scroll', onScroll, { passive: true })
    return () => { removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  if (!on) return null
  return (
    <div
      style={{
        position: 'fixed', bottom: 8, left: 8, zIndex: 9999,
        background: 'rgba(0,0,0,0.8)', color: '#fff',
        font: '12px/1.5 monospace', padding: '6px 9px', borderRadius: 6,
        pointerEvents: 'none', whiteSpace: 'pre',
      }}
    >
      <div>†prev: {prev}</div>
      <div ref={liveRef} />
    </div>
  )
}
