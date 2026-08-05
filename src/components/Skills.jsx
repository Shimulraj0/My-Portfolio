import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Smartphone, Brain, Terminal, Wrench, Code, Rocket, Zap, Cpu } from 'lucide-react'
import { skills } from '../data.js'

const iconMap = {
  smartphone: Smartphone,
  brain: Brain,
  terminal: Terminal,
  wrench: Wrench,
  code: Code,
  rocket: Rocket,
  zap: Zap,
  cpu: Cpu,
}

const colors = {
  smartphone: 'from-teal-500 to-teal-600',
  brain: 'from-terracotta-500 to-terracotta-600',
  terminal: 'from-navy to-navy/80',
  wrench: 'from-terracotta-400 to-terracotta-500',
  code: 'from-accent to-accent-light',
  rocket: 'from-accent-light to-terracotta-400',
  zap: 'from-yellow-400 to-orange-500',
  cpu: 'from-cyan-400 to-blue-500',
}

function SkillBar({ skill, delay }) {
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
    <div ref={barRef} className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{skill}</span>
        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{visible ? '100%' : '0%'}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-terracotta-500 to-accent skill-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: visible ? '100%' : 0 }}
          transition={{ duration: 1.2, delay: delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

function Skills() {
  return (
    <section id="skills" className="bg-gradient-to-b from-cream to-white py-24 transition-colors duration-300 dark:from-zinc-900/60 dark:to-zinc-950">
      <div className="mx-auto max-w-6xl px-6">
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
          {skills.map((group, i) => {
            const Icon = iconMap[group.icon]
            return (
              <motion.div
                key={group.group}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:shadow-terracotta-100/60 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:shadow-none"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-terracotta-500/5 to-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${colors[group.icon] || 'from-terracotta-500 to-terracotta-600'} text-white`}
                  >
                    <Icon size={24} />
                  </span>
                  <h3 className="mt-5 font-bold text-zinc-900 dark:text-white">{group.group}</h3>
                  <div className="mt-4 space-y-1">
                    {group.items.map((item, j) => (
                      <SkillBar key={item} skill={item} delay={i * 0.1 + j * 0.08} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Skills
