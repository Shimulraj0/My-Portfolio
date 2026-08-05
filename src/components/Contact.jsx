import { motion } from 'framer-motion'
import { Mail, Phone, FileText, MapPin, MessageCircle } from 'lucide-react'
import { profile, socials } from '../data.js'
import { GithubIcon, InstagramIcon, LinkedinIcon } from './BrandIcons.jsx'
import { gmailHref, openGmail } from '../gmail.js'

const iconMap = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  instagram: InstagramIcon,
  mail: Mail,
  phone: Phone,
  file: FileText,
}

const hoverMap = {
  github: 'hover:bg-zinc-800 hover:text-white',
  linkedin: 'hover:bg-[#0a66c2] hover:text-white',
  instagram: 'hover:bg-gradient-to-br hover:from-[#f58529] hover:via-[#dd2a7b] hover:to-[#8134af] hover:text-white',
  mail: 'hover:bg-red-500 hover:text-white',
  phone: 'hover:bg-green-500 hover:text-white',
  file: 'hover:bg-orange-500 hover:text-white',
}

function Contact() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-gradient-to-br from-navy via-teal to-navy py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />

      {/* Animated accent orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-terracotta-300">
            Contact
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
            Let&apos;s build something together
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-cream/70">
            Open to Flutter work, AI experiments, or just a chat about Android and tech. Reach
            out anytime.
          </p>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-sm text-terracotta-200">Email</p>
                <a href="mailto:shimulrajdas001@gmail.com" className="text-cream hover:text-white transition-colors">shimulrajdas001@gmail.com</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-sm text-terracotta-200">Phone</p>
                <a href="tel:+8801575204054" className="text-cream hover:text-white transition-colors">+8801575204054</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-sm text-terracotta-200">Location</p>
                <p className="text-cream">{profile.location}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {socials.map((s, i) => {
                const Icon = iconMap[s.icon]
                return (
                  <motion.a
                    key={s.name}
                    href={s.icon === 'mail' ? gmailHref : s.url}
                    onClick={s.icon === 'mail' ? (e) => { e.preventDefault(); openGmail() } : undefined}
                    target={s.url.startsWith('http') && s.icon !== 'mail' ? '_blank' : undefined}
                    rel="noreferrer"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    className={`flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors ${hoverMap[s.icon]}`}
                  >
                    <Icon size={16} />
                    {s.name}
                  </motion.a>
                )
              })}
            </div>
          </motion.div>

          {/* Weavely.ai Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="weavely-container bg-white/5 backdrop-blur-sm p-6">
              <div className="mb-4 flex items-center gap-2">
                <MessageCircle size={18} className="text-terracotta-300" />
                <h3 className="text-lg font-bold text-white">Send a Message</h3>
              </div>
              <iframe
                src="https://weavely.ai/embed/contact"
                title="Contact Form"
                className="weavely-container w-full h-[350px] border-0"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
              />
              <p className="mt-4 text-center text-xs text-cream/50">
                Powered by Weavely AI Form Builder
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Contact
