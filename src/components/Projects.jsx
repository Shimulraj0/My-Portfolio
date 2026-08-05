import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronLeft, ChevronRight, X, Filter, Sparkles } from 'lucide-react'
import { categories, projects } from '../data.js'
import { GithubIcon } from './BrandIcons.jsx'
import Tilt from './Tilt.jsx'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const press = { whileTap: { scale: 0.96 }, whileHover: { scale: 1.03 } }

function PhoneMockup({ src, alt, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.05 }}
      className="relative shrink-0 cursor-zoom-in snap-start"
      aria-label={`View ${alt}`}
    >
      <div className="relative rounded-[1.6rem] border-[5px] border-zinc-900 bg-zinc-900 shadow-xl shadow-zinc-900/20">
        <div className="absolute left-1/2 top-1 h-3 w-16 -translate-x-1/2 rounded-full bg-zinc-900" />
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="aspect-[9/19] w-24 rounded-[1.3rem] object-cover sm:w-28"
        />
      </div>
    </motion.button>
  )
}

function Lightbox({ project, index, onClose, onPrev, onNext }) {
  const image = project.screenshots[index]

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [onClose, onPrev, onNext])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
      >
        <X size={22} />
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPrev() }}
        aria-label="Previous screenshot"
        className="absolute left-3 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:left-6"
      >
        <ChevronLeft size={22} />
      </button>

      <AnimatePresence mode="wait">
        <motion.img
          key={image}
          src={image}
          alt={`${project.title} screenshot ${index + 1}`}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="max-h-[88vh] rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </AnimatePresence>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onNext() }}
        aria-label="Next screenshot"
        className="absolute right-3 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:right-6"
      >
        <ChevronRight size={22} />
      </button>

      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 font-mono text-xs font-semibold text-white">
        {project.title} - {index + 1}/{project.screenshots.length}
      </p>
    </motion.div>
  )
}

function ProjectCard({ project }) {
  const [lightbox, setLightbox] = useState(null)

  const show = useCallback((i) => setLightbox(i), [])
  const close = useCallback(() => setLightbox(null), [])
  const next = useCallback(
    () => setLightbox((i) => (i + 1) % project.screenshots.length),
    [project.screenshots.length],
  )
  const prev = useCallback(
    () => setLightbox((i) => (i - 1 + project.screenshots.length) % project.screenshots.length),
    [project.screenshots.length],
  )

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="group relative overflow-hidden rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm transition-all card-lift dark:border-zinc-800 dark:bg-zinc-900"
    >
      <Tilt max={7} className="relative">
        <div className="absolute -top-1 -right-1 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent dark:bg-accent/20">
            <Sparkles size={10} />
            Featured
          </span>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="shrink-0">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-zinc-500">
              Screens ({project.screenshots.length})
            </p>
            <div className="flex snap-x gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
              {project.screenshots.map((src, i) => (
                <PhoneMockup
                  key={src}
                  src={src}
                  alt={`${project.title} screen ${i + 1}`}
                  onClick={() => show(i)}
                />
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{project.title}</h3>
              <span className="shrink-0 rounded-full bg-terracotta-50 px-2.5 py-0.5 text-xs font-semibold text-terracotta-700 dark:bg-terracotta-500/10 dark:text-terracotta-300">
                {project.tag}
              </span>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{project.description}</p>

            <ul className="mt-4 flex flex-wrap gap-1.5">
              {project.features.map((f) => (
                <li
                  key={f}
                  className="rounded-md border border-zinc-100 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400"
                >
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center gap-3">
              <motion.a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                {...press}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-terracotta-700 hover:scale-105"
              >
                <GithubIcon size={14} />
                Source
              </motion.a>
              <motion.a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                {...press}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 transition-colors hover:text-terracotta-700 dark:text-zinc-400 dark:hover:text-terracotta-400"
              >
                View repo
                <ArrowUpRight size={14} />
              </motion.a>
            </div>
          </div>
        </div>
      </Tilt>

      <AnimatePresence>
        {lightbox !== null && (
          <Lightbox
            project={project}
            index={lightbox}
            onClose={close}
            onPrev={prev}
            onNext={next}
          />
        )}
      </AnimatePresence>
    </motion.article>
  )
}

function Projects() {
  const [active, setActive] = useState('all')
  const filtered =
    active === 'all' ? projects : projects.filter((p) => p.category === active)

  return (
    <section id="projects" className="bg-white py-24 transition-colors duration-300 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-terracotta-600 dark:text-terracotta-400">
            Projects
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Flutter apps, captured live on an Android emulator
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
            Every screenshot below was taken from a running Android emulator, so you get a real
            look at each app in action. Tap any phone to zoom.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4 }}
          className="mb-12 flex flex-wrap justify-center gap-2"
        >
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              type="button"
              onClick={() => setActive(cat.id)}
              {...press}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              whileTap={{ scale: 0.92 }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active === cat.id
                  ? 'bg-terracotta-600 text-white shadow-lg shadow-terracotta-600/25'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:border-terracotta-300 hover:text-terracotta-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-terracotta-500 dark:hover:text-terracotta-400'
              }`}
            >
              {cat.label}
            </motion.button>
          ))}
        </motion.div>

        <motion.div layout className="grid gap-6 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}

export default Projects
