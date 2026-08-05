import { motion } from 'framer-motion'
import { profile } from '../data.js'
import { GithubIcon, LinkedinIcon } from './BrandIcons.jsx'
import VisitorCount from './VisitorCount.jsx'

const press = { whileTap: { scale: 0.92 }, whileHover: { scale: 1.1 } }

function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <p className="font-mono text-sm font-semibold text-terracotta-400">&lt;shimulraj0 /&gt;</p>

        <p className="text-sm text-zinc-400">
          © {new Date().getFullYear()} {profile.name}. Crafted with React, Tailwind & Flutter
          screenshots.
        </p>

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
          <VisitorCount />
          <div className="flex items-center gap-4">
          <motion.a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            {...press}
            className="text-zinc-400 transition-colors hover:text-white"
            aria-label="GitHub"
          >
            <GithubIcon size={18} />
          </motion.a>
          <motion.a
            href={profile.linkedin}
            target="_blank"
            rel="noreferrer"
            {...press}
            className="text-zinc-400 transition-colors hover:text-white"
            aria-label="LinkedIn"
          >
            <LinkedinIcon size={18} />
          </motion.a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
