import useCanvasEffect from '../../hooks/useCanvasEffect.js'
import { isDark } from '../../utils/theme.js'

/**
 * HorizonGrid — an endless floor grid with a glowing horizon, inspired by
 * getdesign.md's "Horizon Grid" effect. A synthwave-style perspective grid
 * where horizontal lines race toward the viewer while the horizon pulses.
 */

function HorizonGrid() {
  const canvasRef = useCanvasEffect((ctx, w, h, t) => {
    const dark = isDark()
    const [r, g, b] = dark ? [34, 211, 238] : [14, 116, 144]

    ctx.clearRect(0, 0, w, h)

    const horizonY = h * 0.42
    const vpX = w / 2
    const depth = h - horizonY

    // Glowing horizon band
    const glow = ctx.createLinearGradient(0, horizonY - 70, 0, horizonY + 10)
    glow.addColorStop(0, 'rgba(0,0,0,0)')
    glow.addColorStop(1, `rgba(${r},${g},${b},${dark ? 0.32 : 0.2})`)
    ctx.fillStyle = glow
    ctx.fillRect(0, horizonY - 70, w, 80)

    // Perspective verticals converging to the vanishing point
    ctx.lineWidth = 1
    const vCount = 22
    for (let i = -vCount; i <= vCount; i++) {
      const spread = Math.abs(i) * (w / vCount) * 0.75
      const baseX = vpX + Math.sign(i) * spread
      const alpha = dark ? 0.14 : 0.1
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.beginPath()
      ctx.moveTo(vpX, horizonY)
      ctx.lineTo(baseX, h)
      ctx.stroke()
    }

    // Horizontal lines racing toward the viewer
    const lineCount = 14
    for (let i = 0; i < lineCount; i++) {
      const f = ((i / lineCount) + (t * 0.14) % 1) % 1 // 0 at horizon, 1 at bottom
      const y = horizonY + Math.pow(f, 2.4) * depth
      const fade = 0.08 + 0.42 * f
      ctx.strokeStyle = `rgba(${r},${g},${b},${dark ? fade : fade * 0.7})`
      ctx.lineWidth = 1 + f * 1.6
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // Horizon pulse line
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.1)
    ctx.strokeStyle = `rgba(${r},${g},${b},${dark ? 0.25 + pulse * 0.25 : 0.15 + pulse * 0.15})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, horizonY)
    ctx.lineTo(w, horizonY)
    ctx.stroke()
  })

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60 dark:opacity-70"
    />
  )
}

export default HorizonGrid
