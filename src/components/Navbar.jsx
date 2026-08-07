import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { useTheme } from '../hooks/useTheme.js'
import { GithubIcon, LinkedinIcon } from './BrandIcons.jsx'

const navItems = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#skills', label: 'Skills' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
]

const press = { whileTap: { scale: 0.94 } }

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('#home')
  const { dark, toggle } = useTheme()

  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 20)
      setHidden(!open && y > lastY && y > 240)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open])

  // Active section highlight (scrollspy). Sections are React.lazy, so query the
  // DOM inside the handler — they may not exist when this effect first runs.
  useEffect(() => {
    const onScrollSpy = () => {
      const probe = window.scrollY + window.innerHeight * 0.35
      let current = '#home'
      for (const item of navItems) {
        const section = document.querySelector(item.href)
        if (section && section.offsetTop <= probe) current = `#${section.id}`
      }
      setActive(current)
    }
    onScrollSpy()
    // Re-evaluate once lazy chunks have likely mounted
    const t = setTimeout(onScrollSpy, 600)
    window.addEventListener('scroll', onScrollSpy, { passive: true })
    window.addEventListener('resize', onScrollSpy, { passive: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', onScrollSpy)
      window.removeEventListener('resize', onScrollSpy)
    }
  }, [])

  useEffect(() => {
    if (open) setHidden(false)
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/60 bg-white/70 shadow-lg shadow-zinc-900/5 backdrop-blur-xl backdrop-saturate-150 dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:shadow-black/30'
          : 'bg-transparent'
      } ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-aqua-500/50 to-transparent" />
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <motion.a
          href="#home"
          {...press}
          className="font-mono text-sm font-semibold tracking-tight text-aqua-600 dark:text-aqua-400"
        >
          &lt;shimulraj0 /&gt;
        </motion.a>

        <ul className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => {
            const isActive = active === item.href
            return (
              <li key={item.href} className="relative">
                <motion.a
                  href={item.href}
                  {...press}
                  whileHover={{ y: -2 }}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-aqua-700 dark:text-aqua-400'
                      : 'text-zinc-600 hover:text-aqua-700 dark:text-zinc-300 dark:hover:text-aqua-400'
                  }`}
                >
                  {item.label}
                </motion.a>
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-aqua-500 dark:bg-aqua-400"
                  />
                )}
              </li>
            )
          })}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <motion.a
            href="https://github.com/Shimulraj0"
            target="_blank"
            rel="noreferrer"
            {...press}
            whileHover={{ y: -2 }}
            className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            aria-label="GitHub"
          >
            <GithubIcon size={18} />
          </motion.a>
          <motion.a
            href="https://www.linkedin.com/in/shimul-raj-das-587847369"
            target="_blank"
            rel="noreferrer"
            {...press}
            whileHover={{ y: -2 }}
            className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            aria-label="LinkedIn"
          >
            <LinkedinIcon size={18} />
          </motion.a>
          <motion.button
            type="button"
            {...press}
            whileHover={{ scale: 1.08 }}
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition-colors hover:border-aqua-300 hover:text-aqua-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-aqua-500 dark:hover:text-aqua-400"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <motion.button
            type="button"
            {...press}
            whileHover={{ scale: 1.08 }}
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition-colors hover:border-aqua-300 hover:text-aqua-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-aqua-500 dark:hover:text-aqua-400"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>
          <motion.button
            type="button"
            {...press}
            whileHover={{ scale: 1.05 }}
            className="text-zinc-700 dark:text-zinc-200"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-aqua-100 bg-white/95 backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
          >
            <ul className="flex flex-col gap-1 px-6 py-4">
              {navItems.map((item) => {
                const isActive = active === item.href
                return (
                  <li key={item.href}>
                    <motion.a
                      href={item.href}
                      {...press}
                      whileHover={{ x: 4 }}
                      onClick={() => setOpen(false)}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                        isActive
                          ? 'bg-aqua-50 text-aqua-700 dark:bg-zinc-900 dark:text-aqua-400'
                          : 'text-zinc-700 hover:bg-aqua-50 hover:text-aqua-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-aqua-400'
                      }`}
                    >
                      {item.label}
                    </motion.a>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Navbar
