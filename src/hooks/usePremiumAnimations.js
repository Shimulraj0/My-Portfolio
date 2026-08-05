import { useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export function useScrollProgress() {
  const { scrollYProgress } = useScroll()
  return scrollYProgress
}

export function useParallax(speed = 0.5) {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, speed * 200])
  return y
}

export function useMagnetic(ref, strength = 0.15) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const handleMove = (e) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      x.set((e.clientX - cx) * strength)
      y.set((e.clientY - cy) * strength)
    }
    const handleLeave = () => {
      x.set(0)
      y.set(0)
    }
    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
    }
  }, [ref, strength, x, y])

  const sx = useSpring(x, { stiffness: 200, damping: 24 })
  const sy = useSpring(y, { stiffness: 200, damping: 24 })
  return { x: sx, y: sy }
}

export function useTextSplit(text, delay = 0.02) {
  const chars = text.split('').map((char, i) => ({
    char: char === ' ' ? '\u00A0' : char,
    delay: i * delay,
  }))
  return chars
}

export function useScrollReveal(threshold = 0.1, once = true) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.unobserve(el)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, once])

  return { ref, isVisible }
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(media.matches)
    const handler = (e) => setReduced(e.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])
  return reduced
}

export function useMouse() {
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 })
  useEffect(() => {
    const handler = (e) => {
      setPos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])
  return pos
}

export const easings = {
  smooth: [0.25, 0.46, 0.45, 0.94],
  spring: { type: 'spring', stiffness: 400, damping: 28 },
  springSoft: { type: 'spring', stiffness: 200, damping: 22 },
  bounce: { type: 'spring', stiffness: 500, damping: 20 },
  expo: [0.87, 0, 0.13, 1],
  circ: [0.075, 0.82, 0.165, 1],
}