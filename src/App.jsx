import { lazy, Suspense, useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import Lenis from 'lenis'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import AuroraBackground from './components/AuroraBackground.jsx'
import CursorGlow from './components/CursorGlow.jsx'
import Marquee from './components/Marquee.jsx'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const About = lazy(() => import('./components/About.jsx'))
const Skills = lazy(() => import('./components/Skills.jsx'))
const Projects = lazy(() => import('./components/Projects.jsx'))
const Contact = lazy(() => import('./components/Contact.jsx'))
const Footer = lazy(() => import('./components/Footer.jsx'))
const ChatWidget = lazy(() => import('./components/ChatWidget.jsx'))

function ScrollReveal() {
  const ref = useRef(null)

  useEffect(() => {
    const elements = ref.current?.querySelectorAll('.reveal-up, .reveal-left, .reveal-right')
    if (!elements?.length) return

    elements.forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => el.classList.add('revealed'),
      })
    })

    return () => ScrollTrigger.getAll().forEach(st => st.kill())
  }, [])

  return null
}

function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const lenis = new Lenis({ lerp: 0.09 })

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href === '#') return
      e.preventDefault()
      if (href === '#home') {
        lenis.scrollTo(0, { duration: 1.2 })
      } else {
        const target = document.querySelector(href)
        if (target) lenis.scrollTo(target, { offset: -76, duration: 1.2 })
      }
    }
    document.addEventListener('click', onClick)

    const refresh = setTimeout(() => ScrollTrigger.refresh(), 100)

    return () => {
      clearTimeout(refresh)
      document.removeEventListener('click', onClick)
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [])

  return null
}

function ScrollProgress() {
  const scaleX = useSpring(useMotionValue(0), { stiffness: 100, damping: 25, mass: 0.3 })

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scaleX.set(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [scaleX])

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-terracotta-500 via-accent to-teal"
    />
  )
}

function App() {
  return (
    <div className="relative min-h-screen bg-cream text-navy transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
      <AuroraBackground />
      <ScrollReveal />
      <SmoothScroll />
      <ScrollProgress />
      <CursorGlow />
      <div className="relative z-10">
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Suspense fallback={null}>
          <About />
        </Suspense>
        <Suspense fallback={null}>
          <Skills />
        </Suspense>
        <Suspense fallback={null}>
          <Projects />
        </Suspense>
        <Suspense fallback={null}>
          <Contact />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
      </div>
    </div>
  )
}

export default App
