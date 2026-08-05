import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Smartphone, Brain, Terminal, Wrench } from 'lucide-react'
import { skills } from '../data.js'
import { TechIcon } from './TechIcons.jsx'
import { useSpotlight } from '../hooks/useSpotlight.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const iconMap = {
  smartphone: Smartphone,
  brain: Brain,
  terminal: Terminal,
  wrench: Wrench,
}

const colors = {
  smartphone: 'from-sky-500 to-sky-600',
  brain: 'from-terracotta-500 to-terracotta-600',
  terminal: 'from-navy to-teal',
  wrench: 'from-accent to-accent-light',
}

function SkillCard({ group, index }) {
  const spotlight = useSpotlight()
  const batchRef = useRef(null)
  const Icon = iconMap[group.icon]

  useEffect(() => {
    const el = batchRef.current
    if (!el) return undefined
    const tiles = el.querySelectorAll('.skill-tile')
    if (!tiles.length) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    gsap.set(tiles, {
      opacity: 0,
      rotationX: -90,
      y: 30,
      transformPerspective: 900,
      transformOrigin: '50% 100%',
    })

    const batch = ScrollTrigger.batch(tiles, {
      start: 'top 88%',
      once: true,
      onEnter: (entered) =>
        gsap.to(entered, {
          opacity: 1,
          rotationX: 0,
          y: 0,
          duration: 0.65,
          stagger: 0.07,
          ease: 'back.out(1.7)',
          onComplete: () => gsap.set(entered, { clearProps: 'transform' }),
        }),
    })

    return () => {
      batch?.scrollTriggers?.forEach((st) => st.kill())
    }
  }, [])

  return (
    <motion.div
      {...spotlight}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="spotlight-card glass relative overflow-hidden rounded-3xl p-5 transition-shadow hover:shadow-2xl hover:shadow-accent/10 dark:hover:shadow-accent/20 sm:p-6"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-terracotta-400/40 to-transparent" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${colors[group.icon] || 'from-terracotta-500 to-terracotta-600'} text-white shadow-lg`}
          >
            <Icon size={22} />
          </span>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">{group.group}</h3>
        </div>

        <div ref={batchRef} className="grid grid-cols-2 gap-2.5" style={{ transformStyle: 'preserve-3d' }}>
          {group.items.map((item) => (
            <div
              key={item}
              className="skill-tile group relative flex min-h-[4.5rem] cursor-default flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/60 bg-white/70 px-2 py-3 text-center shadow-sm transition-all duration-300 hover:border-terracotta-300/70 hover:shadow-xl hover:shadow-terracotta-500/10 dark:border-white/10 dark:bg-zinc-800/70 dark:hover:border-accent/40 dark:hover:shadow-accent/20"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <span className="transition-transform duration-300 group-hover:-translate-y-1">
                <TechIcon name={item} size={22} />
              </span>
              <span className="text-[10.5px] font-semibold leading-tight text-zinc-700 dark:text-zinc-300">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function Skills() {
  return (
    <section
      id="skills"
      className="relative overflow-hidden bg-gradient-to-b from-cream via-white to-white py-24 transition-colors duration-300 dark:from-zinc-900/60 dark:via-zinc-950 dark:to-zinc-950"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-24 h-80 w-80 rounded-full bg-terracotta-500/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-terracotta-600 dark:text-terracotta-400">
            Tech Stack
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            What I work with
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-500 dark:text-zinc-400">
            A curated batch of tools and technologies I use to build polished products.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {skills.map((group, i) => (
            <SkillCard key={group.group} group={group} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Skills
