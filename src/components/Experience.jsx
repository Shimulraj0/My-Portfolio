import { motion } from 'framer-motion'
import { Briefcase, GraduationCap, Sparkles } from 'lucide-react'
import { profile } from '../data.js'

const press = { whileTap: { scale: 0.98 } }

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: 'easeOut' },
}

function Experience() {
  const jobs = profile.experience || []
  const education = profile.education

  // Build the timeline: work first (most recent), then education.
  const items = [
    ...jobs.map((job, i) => ({
      id: `work-${i}`,
      kind: 'work',
      title: job.role,
      org: job.company,
      period: job.period,
      points: job.highlights || [],
      icon: Briefcase,
    })),
    {
      id: 'edu',
      kind: 'edu',
      title: education.degree,
      org: education.school,
      period: `Session ${education.graduation}`,
      points: [`CGPA ${education.cgpa}`],
      icon: GraduationCap,
    },
  ]

  return (
    <section
      id="experience"
      className="relative overflow-hidden bg-gradient-to-b from-white via-cream to-white py-24 transition-colors duration-300 dark:from-zinc-950 dark:via-zinc-900/40 dark:to-zinc-950"
    >
      {/* ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-aqua-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-aqua-500/5 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div {...fadeUp} className="mb-16 text-center">
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-aqua-600 dark:text-aqua-400">
            Journey
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Experience &amp; Education
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-500 dark:text-zinc-400">
            Where I&apos;ve been — and what I&apos;m working toward.
          </p>
        </motion.div>

        <div className="relative mx-auto max-w-3xl">
          {/* vertical aqua line */}
          <motion.div
            aria-hidden
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="absolute left-5 top-2 h-[calc(100%-1rem)] w-px origin-top bg-gradient-to-b from-aqua-500/70 via-aqua-500/30 to-transparent sm:left-1/2 sm:-translate-x-1/2"
          />

          {items.map((item, idx) => {
            const Icon = item.icon
            const leftSide = idx % 2 === 0
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                className={`relative mb-10 pl-14 last:mb-0 sm:pl-0 ${
                  leftSide ? 'sm:pr-[calc(50%+2.5rem)]' : 'sm:pl-[calc(50%+2.5rem)] sm:text-left'
                }`}
              >
                {/* node */}
                <span
                  aria-hidden
                  className="absolute left-5 top-1 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-aqua-300 bg-white shadow-lg shadow-aqua-500/20 dark:border-aqua-500/50 dark:bg-zinc-900 sm:left-1/2"
                >
                  <Icon size={17} className="text-aqua-600 dark:text-aqua-400" />
                </span>

                <motion.div
                  {...press}
                  whileHover={{ y: -4 }}
                  className="aura-hairline group rounded-3xl border border-zinc-100 bg-white/90 p-6 shadow-lg shadow-zinc-900/5 backdrop-blur-sm transition-colors hover:border-aqua-200 dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-black/20 dark:hover:border-aqua-500/40"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs font-semibold uppercase tracking-widest text-aqua-600 dark:text-aqua-400">
                      {item.period}
                    </p>
                    {item.kind === 'work' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-aqua-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-aqua-700 dark:bg-aqua-500/15 dark:text-aqua-300">
                        <Sparkles size={10} />
                        Work
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-zinc-900 dark:text-white">{item.title}</h3>
                  <p className="mt-0.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">{item.org}</p>
                  <ul className="mt-3 space-y-1.5">
                    {item.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Experience
