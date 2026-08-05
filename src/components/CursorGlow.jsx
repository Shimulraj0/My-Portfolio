import { useEffect } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

function CursorGlow() {
  const x = useMotionValue(-500)
  const y = useMotionValue(-500)
  const sx = useSpring(x, { stiffness: 120, damping: 30, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 120, damping: 30, mass: 0.6 })

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return undefined

    const onMove = (e) => {
      x.set(e.clientX - 250)
      y.set(e.clientY - 250)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [x, y])

  return (
    <motion.div
      aria-hidden="true"
      className="cursor-glow pointer-events-none fixed z-[6] hidden h-[500px] w-[500px] rounded-full md:block"
      style={{ x: sx, y: sy }}
    />
  )
}

export default CursorGlow
