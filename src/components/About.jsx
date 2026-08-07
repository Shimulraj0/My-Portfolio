import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import { profile } from '../data.js'
import GlyphTide from './effects/GlyphTide.jsx'
import FluidBackground from './effects/FluidBackground.jsx'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut' },
}

const press = { whileTap: { scale: 0.98 } }

function About() {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-white py-24 transition-colors duration-300 dark:bg-zinc-950"
    >
      <GlyphTide />
      {/* WebGL fluid background (adapted from WebGL-Fluid-Simulation, MIT) */}
      <FluidBackground variant="about" />
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div {...fadeUp} className="mb-14 text-center">
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-aqua-600 dark:text-aqua-400">
            About Me
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Building apps, exploring AI, tinkering with tech
          </h2>
        </motion.div>

        <div className="grid gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-5"
          >
            {profile.about.map((para, i) => (
              <p key={i} className="leading-relaxed text-zinc-600 dark:text-zinc-400">
                {para}
              </p>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              {['Voice AI App', 'LLM Translation', 'Cross-platform', 'Smart Automation'].map(
                (t) => (
                  <motion.span
                    key={t}
                    {...press}
                    className="cursor-default rounded-full border border-aqua-100 bg-aqua-50 px-3 py-1 text-xs font-semibold text-aqua-700 dark:border-aqua-500/40 dark:bg-aqua-500/10 dark:text-aqua-300"
                  >
                    {t}
                  </motion.span>
                ),
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="rounded-3xl border border-zinc-100 bg-gradient-to-br from-aqua-50/70 to-white p-8 shadow-lg shadow-aqua-100/40 dark:border-zinc-800 dark:from-zinc-900/70 dark:to-zinc-900 dark:shadow-none"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-aqua-600 text-white">
                <GraduationCap size={22} />
              </span>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Education</h3>
            </div>
            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Degree</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white">{profile.education.degree}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Institution</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white">{profile.education.school}</dd>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Session</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-white">
                    {profile.education.graduation}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">CGPA</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-white">{profile.education.cgpa}</dd>
                </div>
              </div>
            </dl>
            <div className="mt-8 rounded-2xl border border-aqua-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-aqua-700 dark:text-aqua-400">Currently building:</span> a
                voice-controlled AI app in Flutter, exploring LLMs for Bengali–English
                translation.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default About
