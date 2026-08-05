import { useRef, useEffect, useState } from 'react'
import { motion, animate, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Download, MapPin, Zap, Rocket, Globe } from 'lucide-react'
import { profile } from '../data.js'
import { GithubIcon, LinkedinIcon } from './BrandIcons.jsx'
import { TechIcon } from './TechIcons.jsx'
import Tilt from './Tilt.jsx'
import Magnetic from './Magnetic.jsx'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const press = { whileTap: { scale: 0.96 }, whileHover: { scale: 1.03 } }

const NAME = 'Shimul Raj Das'

function CountUp({ to, suffix = '' }) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(to)
      return undefined
    }
    let controls = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        controls = animate(0, to, {
          duration: 1.4,
          ease: [0.16, 1, 0.3, 1],
          onUpdate: (v) => setVal(Math.round(v)),
        })
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      controls?.stop()
    }
  }, [to])

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  )
}

const chips = [
  { name: 'Flutter', pos: '-left-4 top-8 sm:-left-8', delay: '0s' },
  { name: 'OpenAI', pos: '-right-3 top-1/3 sm:-right-7', delay: '1.5s' },
  { name: 'Android', pos: '-bottom-2 left-6 sm:-left-3 sm:bottom-10', delay: '3s' },
]

function Hero() {
  const ref = useRef(null)
  const nameRef = useRef(null)
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 55, damping: 18, mass: 0.6 })
  const sy = useSpring(my, { stiffness: 55, damping: 18, mass: 0.6 })
  const orb1X = useTransform(sx, (v) => v * 60 - 30)
  const orb1Y = useTransform(sy, (v) => v * 60 - 30)
  const orb2X = useTransform(sx, (v) => v * -40 + 20)
  const orb2Y = useTransform(sy, (v) => v * -40 + 20)
  const chipX = useTransform(sx, (v) => (v - 0.5) * 24)
  const chipY = useTransform(sy, (v) => (v - 0.5) * 16)

  useEffect(() => {
    const heroRef = ref.current
    if (!heroRef) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroRef,
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      },
    })

    tl.to(heroRef.querySelector('.hero-glow-1'), {
      y: -80,
      opacity: 0.3,
      ease: 'none',
    })
    .to(heroRef.querySelector('.hero-glow-2'), {
      y: 60,
      opacity: 0.2,
      ease: 'none',
    }, '<')

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill())
    }
  }, [])

  useEffect(() => {
    const chars = nameRef.current?.querySelectorAll('.name-char')
    if (!chars?.length) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const tween = gsap.fromTo(
      chars,
      { yPercent: 120 },
      { yPercent: 0, duration: 0.9, stagger: 0.03, ease: 'power4.out', delay: 0.45 }
    )
    return () => tween.kill()
  }, [])

  const onMove = (e) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mx.set((e.clientX - rect.left) / rect.width)
    my.set((e.clientY - rect.top) / rect.height)
  }

  return (
    <section
      id="home"
      ref={ref}
      onMouseMove={onMove}
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-28 pb-16 sm:pt-32"
    >
      {/* Animated gradient orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-terracotta-200/60 to-terracotta-100/40 blur-3xl dark:from-terracotta-500/15 dark:to-terracotta-500/10 hero-glow-1"
        style={{ x: orb1X, y: orb1Y }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-40 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-teal-100/50 to-terracotta-100/40 blur-3xl dark:from-teal-500/10 dark:to-terracotta-500/10 hero-glow-2"
        style={{ x: orb2X, y: orb2Y }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Accent orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-accent/5 blur-2xl float-animation"
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-terracotta-400/5 blur-2xl float-animation"
        style={{ animationDelay: '2s' }}
      />

      {/* Grid pattern overlay */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
        <div className="h-full w-full" style={{
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 md:grid-cols-[1.2fr_1fr] lg:gap-16">
        <motion.div variants={container} initial="hidden" animate="show" className="order-last text-center md:order-none md:text-left">
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-4 py-1.5 font-mono text-xs font-semibold text-zinc-600 backdrop-blur dark:border-zinc-700/70 dark:bg-zinc-900/70 dark:text-zinc-300"
          >
            <span className="relative flex h-2 w-2">
              <span className="dot-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">~/shimul</span>
            <span className="text-terracotta-500 dark:text-terracotta-400">$</span>
            flutter dev · ai &amp; llm · android
            <span className="term-caret inline-block h-3.5 w-1.5 bg-terracotta-500" />
          </motion.span>

          <motion.h1
            ref={nameRef}
            variants={item}
            className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-white"
          >
            Hi, I&apos;m{' '}
            <span className="inline-block text-terracotta-600 dark:text-terracotta-400">
              {NAME.split('').map((c, i) => (
                <span key={i} className="inline-block overflow-hidden align-bottom">
                  <span className="name-char inline-block">
                    {c === ' ' ? '\u00A0' : c}
                  </span>
                </span>
              ))}
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg md:mx-0 dark:text-zinc-400"
          >
            I build polished cross-platform apps with{' '}
            <span className="font-semibold text-navy dark:text-white">Flutter</span>, explore AI & LLMs for
            real-world use, and tinker with Android ROMs, hardware, and macOS installers.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start"
          >
            <Magnetic>
              <motion.a
                href="#projects"
                {...press}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                className="group inline-flex items-center gap-2 rounded-xl bg-terracotta-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-terracotta-600/25 transition-all hover:bg-terracotta-700 hover:shadow-terracotta-700/30 hover:scale-105"
              >
                <Rocket size={16} />
                View My Work
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </motion.a>
            </Magnetic>
            <Magnetic>
              <motion.a
                href={profile.resume}
                target="_blank"
                rel="noreferrer"
                {...press}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition-all hover:border-terracotta-300 hover:text-terracotta-700 hover:scale-105 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-terracotta-500 dark:hover:text-terracotta-400"
              >
                <Download size={16} />
                Resume
              </motion.a>
            </Magnetic>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start"
          >
            <motion.a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              {...press}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:border-terracotta-300 hover:text-terracotta-700 hover:scale-105 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-terracotta-500 dark:hover:text-terracotta-400"
            >
              <GithubIcon size={16} />
              GitHub
            </motion.a>
            <motion.a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
              {...press}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:border-terracotta-300 hover:text-terracotta-700 hover:scale-105 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-terracotta-500 dark:hover:text-terracotta-400"
            >
              <LinkedinIcon size={16} />
              LinkedIn
            </motion.a>
            <span className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              <MapPin size={14} />
              {profile.location}
            </span>
          </motion.div>

          {/* Animated stats row */}
          <motion.div
            variants={item}
            className="mt-10 flex items-center justify-center gap-8 md:justify-start"
          >
            {[
              { value: 8, suffix: '+', label: 'Projects', icon: <Globe size={18} /> },
              { value: 2, suffix: '', label: 'Years Exp', icon: <Zap size={18} /> },
              { value: 4, suffix: '', label: 'Tech Stacks', icon: <Rocket size={18} /> },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                className="glass-strong flex flex-col items-center gap-1 rounded-2xl border border-white/50 px-4 py-2 backdrop-blur-md"
              >
                <span className="text-terracotta-600 dark:text-terracotta-400">{stat.icon}</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  <CountUp to={stat.value} suffix={stat.suffix} />
                </span>
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="order-first mx-auto md:order-none"
        >
          <Tilt max={12} className="mx-auto">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-6 -z-10 rounded-[3rem] bg-[conic-gradient(from_180deg,#e76f51,#7c3aed,#264653,#e76f51)] opacity-50 blur-2xl"
              />
              <div
                aria-hidden
                className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-navy/20 to-terracotta-500/25 blur-2xl pulse-glow"
              />
              <img
                src={profile.photo}
                alt="Shimul Raj Das"
                fetchPriority="high"
                decoding="async"
                className="relative aspect-square w-52 rounded-[2rem] border-4 border-white object-cover shadow-2xl sm:w-64 lg:w-80"
              />

              {chips.map((chip) => (
                <motion.div
                  key={chip.name}
                  aria-hidden
                  className={`glass-strong absolute ${chip.pos} z-10 rounded-2xl px-3 py-2 shadow-xl float-animation`}
                  style={{ animationDelay: chip.delay, x: chipX, y: chipY }}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    <TechIcon name={chip.name} size={16} />
                    {chip.name}
                  </span>
                </motion.div>
              ))}

              <div className="absolute -bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-2xl border border-terracotta-100 bg-white px-5 py-2.5 text-center shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <p className="flex items-center gap-2 font-mono text-xs font-semibold text-terracotta-700 dark:text-terracotta-300">
                  <TechIcon name="Flutter" size={13} />
                  Flutter · AI · Android
                </p>
              </div>
            </div>
          </Tilt>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <div aria-hidden className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-zinc-400 dark:text-zinc-500 md:flex">
        <span className="font-mono text-[10px] uppercase tracking-widest">scroll</span>
        <span className="flex h-8 w-5 items-start justify-center rounded-full border border-current p-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
        </span>
      </div>
    </section>
  )
}

export default Hero
