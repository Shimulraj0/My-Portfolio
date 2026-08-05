import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Smartphone, Brain, Terminal, Wrench } from 'lucide-react'
import { skills } from '../data.js'
import { TechIcon } from './TechIcons.jsx'
import { useSpotlight } from '../hooks/useSpotlight.js'

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

function SkillRow({ skill, delay }) {
  const barRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    if (barRef.current) observer.observe(barRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={barRef} className="mb-4 last:mb-0">
      <div className="mb-1 flex items-center gap-2">
        <TechIcon name={skill} size={15} />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{skill}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-terracotta-500 to-accent skill-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: visible ? '100%' : 0 }}
          transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

function SkillCard({ group, index }) {
  const spotlight = useSpotlight()
  const Icon = iconMap[group.icon]

  return (
    <motion.div
      {...spotlight}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="spotlight-card glass relative overflow-hidden rounded-3xl p-6 transition-all hover:shadow-2xl hover:shadow-accent/10 dark:hover:shadow-accent/20"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-terracotta-400/40 to-transparent" />
      <div className="relative">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${colors[group.icon] || 'from-terracotta-500 to-terracotta-600'} text-white shadow-lg`}
        >
          <Icon size={24} />
        </span>
        <h3 className="mt-5 font-bold text-zinc-900 dark:text-white">{group.group}</h3>
        <div className="mt-4">
          {group.items.map((item, j) => (
            <SkillRow key={item} skill={item} delay={index * 0.1 + j * 0.08} />
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
            A curated set of tools and technologies I use to build polished products.
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
