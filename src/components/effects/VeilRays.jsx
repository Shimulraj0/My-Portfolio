import useCanvasEffect from '../../hooks/useCanvasEffect.js'
import { isDark } from '../../utils/theme.js'

/**
 * VeilRays — soft volumetric light falling from above, inspired by
 * getdesign.md's "Veil Rays" effect. A few gently swaying aqua light cones
 * breathe over time, with a subtle film-grain flicker for depth.
 */

function VeilRays() {
  const canvasRef = useCanvasEffect((ctx, w, h, t) => {
    const dark = isDark()
    const [r, g, b] = dark ? [34, 211, 238] : [14, 116, 144]
    const maxAlpha = dark ? 0.22 : 0.15

    ctx.clearRect(0, 0, w, h)

    // Vertical falloff so beams fade toward the bottom
    const beamCount = 5
    for (let i = 0; i < beamCount; i++) {
      const seed = i * 1.7 + 1.3
      // drifting x position across the width
      const x = w * (0.12 + 0.76 * (i / (beamCount - 1))) + Math.sin(t * 0.25 + seed) * w * 0.08
      const sway = Math.sin(t * 0.4 + seed * 2) * 0.14
      const breathe = 0.65 + 0.35 * Math.sin(t * 0.8 + seed)
      const halfTop = w * 0.02
      const halfBottom = w * (0.055 + 0.02 * Math.sin(t * 0.5 + seed))

      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, `rgba(${r},${g},${b},${(maxAlpha * breathe).toFixed(3)})`)
      grad.addColorStop(0.55, `rgba(${r},${g},${b},${(maxAlpha * 0.35 * breathe).toFixed(3)})`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(x - halfTop, 0)
      ctx.lineTo(x + halfTop, 0)
      ctx.lineTo(x + halfBottom + sway * w * 0.06, h)
      ctx.lineTo(x - halfBottom + sway * w * 0.06, h)
      ctx.closePath()
      ctx.fill()
    }

    // Soft center glow behind everything
    const centerGlow = ctx.createRadialGradient(w / 2, h * 0.32, 0, w / 2, h * 0.32, w * 0.55)
    centerGlow.addColorStop(0, `rgba(${r},${g},${b},${dark ? 0.12 : 0.07})`)
    centerGlow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = centerGlow
    ctx.fillRect(0, 0, w, h)

    // Film-grain flicker
    const grainAlpha = dark ? 0.05 : 0.03
    for (let i = 0; i < 90; i++) {
      const gx = Math.random() * w
      const gy = Math.random() * h
      ctx.fillStyle = `rgba(${r},${g},${b},${grainAlpha * Math.random()})`
      ctx.fillRect(gx, gy, 1.4, 1.4)
    }
  })

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
    />
  )
}

export default VeilRays

