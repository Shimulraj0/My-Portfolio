import { useEffect, useRef } from 'react'

/**
 * useCanvasEffect — shared engine for section-level animated backgrounds.
 *
 * Sizes the canvas to its positioned parent, scales by devicePixelRatio,
 * runs `draw(ctx, width, height, time)` every frame, and pauses the loop
 * when the element is out of view or the tab is hidden. For
 * prefers-reduced-motion it paints a single static frame and stops.
 *
 * @param {(ctx, w, h, t) => void} draw render function
 * @param {object} [opts]
 * @param {number} [opts.dprCap=2] max device pixel ratio
 */
export default function useCanvasEffect(draw, { dprCap = 2 } = {}) {
  const canvasRef = useRef(null)
  const drawRef = useRef(draw)
  drawRef.current = draw

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let raf = 0
    let running = false
    let inView = false
    let visible = !document.hidden

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      const parent = canvas.parentElement
      const rect = parent ? parent.getBoundingClientRect() : { width: 0, height: 0 }
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (reduced) drawRef.current(ctx, width, height, 0)
    }
    resize()

    const render = (now) => {
      drawRef.current(ctx, width, height, now / 1000)
      raf = requestAnimationFrame(render)
    }

    // Keep the buffer in sync when the section resizes for any reason
    // (webfont load, lazy content settling, zoom) — not just window resizes.
    let resizeObserver = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(canvas.parentElement)
    }

    const start = () => {
      if (running || reduced) return
      if (!inView || !visible) return
      running = true
      raf = requestAnimationFrame(render)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    let observer = null
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          inView = entries[0].isIntersecting
          if (inView) start()
          else stop()
        },
        { rootMargin: '120px' },
      )
      observer.observe(canvas)
    } else {
      inView = true
      start()
    }

    const onVisibility = () => {
      visible = !document.hidden
      if (visible) start()
      else stop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', resize)

    // resize() already painted the reduced-motion static frame; otherwise start
    // once the initial IntersectionObserver callback has set inView.
    if (!reduced && inView && visible) start()

    return () => {
      stop()
      observer?.disconnect()
      resizeObserver?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', resize)
    }
  }, [dprCap])

  return canvasRef
}
