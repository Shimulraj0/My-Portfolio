import { useEffect, useRef } from 'react'
import { isDark } from '../utils/theme.js'

/**
 * GoldDust — an original canvas-2d animated background in the spirit of
 * getdesign.md's animated background effects (Silk Flow / Veil Rays / Glyph Tide).
 *
 * Aqua specks drift upward with a soft twinkle, nearby particles link into a
 * faint constellation, and the whole field parallax-shifts toward the cursor.
 * Theme-aware (bright aqua on obsidian dark, deeper aqua on paper light),
 * DPR-capped, pauses in background tabs, and respects prefers-reduced-motion.
 */

const AQUA_DARK = [34, 211, 238] // aqua-400, bright on obsidian
const AQUA_LIGHT = [14, 116, 144] // aqua-700, deeper on paper light
const AQUA_LINE = [34, 211, 238]
const PARALLAX = 0.09 // shared parallax factor for lines + particles

function GoldDust() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4

    let width = 0
    let height = 0
    let particles = []
    let raf = 0
    let running = false
    let last = performance.now()

    // Mouse state, initialized to viewport center so the field is never
    // offset before the first pointermove (avoids a jarring shift on load).
    const target = { x: 0, y: 0 }
    const pos = { x: 0, y: 0 }

    const countFor = (w, h) => {
      const area = w * h
      const per = lowPower ? 26000 : 14000
      return Math.max(lowPower ? 20 : 32, Math.min(lowPower ? 60 : 150, Math.round(area / per)))
    }

    function makeParticles(w, h) {
      const count = countFor(w, h)
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 1.7,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(0.05 + Math.random() * 0.22),
        depth: 0.35 + Math.random() * 0.65,
        twinkle: 0.7 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.3 + Math.random() * 0.6,
      }))
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      target.x = width / 2
      target.y = height / 2
      pos.x = width / 2
      pos.y = height / 2
      makeParticles(width, height)
    }
    resize()

    const onPointer = (e) => {
      target.x = e.clientX
      target.y = e.clientY
    }
    if (finePointer && !reduced) window.addEventListener('pointermove', onPointer, { passive: true })

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      pos.x += (target.x - pos.x) * 0.045
      pos.y += (target.y - pos.y) * 0.045

      const dark = isDark()
      const [gr, gg, gb] = dark ? AQUA_DARK : AQUA_LIGHT
      const lineAlphaBase = dark ? 0.16 : 0.1
      const connectDist = 110
      const connectDist2 = connectDist * connectDist
      const ox = pos.x - width / 2
      const oy = pos.y - height / 2

      ctx.clearRect(0, 0, width, height)

      // --- constellation lines ---
      if (particles.length <= 90) {
        ctx.lineWidth = 0.6
        for (let i = 0; i < particles.length; i++) {
          const a = particles[i]
          const ax = a.x + ox * a.depth * PARALLAX
          const ay = a.y + oy * a.depth * PARALLAX
          for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j]
            const dx = ax - (b.x + ox * b.depth * PARALLAX)
            const dy = ay - (b.y + oy * b.depth * PARALLAX)
            const d2 = dx * dx + dy * dy
            if (d2 < connectDist2) {
              const alpha = lineAlphaBase * (1 - Math.sqrt(d2) / connectDist)
              ctx.strokeStyle = `rgba(${AQUA_LINE[0]},${AQUA_LINE[1]},${AQUA_LINE[2]},${alpha.toFixed(3)})`
              ctx.beginPath()
              ctx.moveTo(ax, ay)
              ctx.lineTo(b.x + ox * b.depth * PARALLAX, b.y + oy * b.depth * PARALLAX)
              ctx.stroke()
            }
          }
        }
      }

      // --- particles ---
      for (const p of particles) {
        p.x += p.vx * dt * 60
        p.y += p.vy * dt * 60
        p.x += Math.sin(now * 0.0004 + p.phase) * 0.02
        p.y += Math.cos(now * 0.0003 + p.phase) * 0.015

        // wrap around edges
        if (p.y < -12) { p.y = height + 10; p.x = Math.random() * width }
        if (p.y > height + 12) p.y = -10
        if (p.x < -12) p.x = width + 10
        if (p.x > width + 12) p.x = -10

        const tw = 0.55 + 0.45 * Math.sin(now * 0.001 * p.twinkle + p.phase)
        const alpha = p.alpha * tw

        const px = p.x + ox * p.depth * PARALLAX
        const py = p.y + oy * p.depth * PARALLAX

        // halo for larger particles
        ctx.fillStyle = `rgba(${gr},${gg},${gb},${(alpha * 0.16).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(px, py, p.r * 3.2, 0, Math.PI * 2)
        ctx.fill()

        // core
        ctx.fillStyle = `rgba(${gr},${gg},${gb},${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(px, py, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const loop = (now) => {
      draw(now)
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (!running && !reduced) {
        running = true
        raf = requestAnimationFrame(loop)
      }
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    if (reduced || document.hidden) draw(performance.now())
    else start()

    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-70 dark:opacity-80"
    />
  )
}

export default GoldDust
