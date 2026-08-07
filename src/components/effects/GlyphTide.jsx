import useCanvasEffect from '../../hooks/useCanvasEffect.js'
import { isDark } from '../../utils/theme.js'

/**
 * GlyphTide — terminal glyphs breathing in a wave field, inspired by
 * getdesign.md's "Glyph Tide" effect. Characters drift and pulse in bands,
 * evoking a living code/terminal background.
 */

const GLYPHS = '{}[]()<>/\\|*+=#%&$@?!~^_·'.split('')
const CELL = 30

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function GlyphTide() {
  const canvasRef = useCanvasEffect((ctx, w, h, t) => {
    const dark = isDark()
    const [r, g, b] = dark ? [34, 211, 238] : [14, 116, 144]
    const baseAlpha = dark ? 0.5 : 0.34

    ctx.clearRect(0, 0, w, h)

    const cols = Math.ceil(w / CELL)
    const rows = Math.ceil(h / CELL)

    // Deterministic per-cell glyph selection so it doesn't flicker randomly
    ctx.font = '600 14px "JetBrains Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * CELL + CELL / 2
        const py = y * CELL + CELL / 2

        // wave across both axes + slow drift
        const wave =
          Math.sin(px * 0.018 + t * 0.9) * 0.5 + Math.cos(py * 0.02 - t * 0.7) * 0.5
        const pulse = 0.55 + 0.45 * Math.sin(t * 1.3 + px * 0.01 + py * 0.02)

        // skip most glyphs so it reads as a sparse, breathing tide
        if (wave < 0.15) continue

        const alpha = Math.min(1, baseAlpha * (0.35 + 0.65 * pulse))
        const glyph = GLYPHS[Math.floor(hash(x, y) * GLYPHS.length)]

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`
        ctx.fillText(glyph, px, py)
      }
    }
  })

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60 dark:opacity-70"
    />
  )
}

export default GlyphTide
