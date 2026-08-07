import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquareText, FileText } from 'lucide-react'
import { profile, socials } from '../data.js'
import { GithubIcon, InstagramIcon, LinkedinIcon } from './BrandIcons.jsx'
import { openGmailCompose } from '../gmail.js'
import VeilRays from './effects/VeilRays.jsx'
import FluidBackground from './effects/FluidBackground.jsx'

const DIRECT = [
  { label: 'Email', value: profile.email, href: `mailto:${profile.email}`, icon: Mail },
  { label: 'Phone', value: profile.phone, href: `tel:${profile.phone}`, icon: Phone },
  { label: 'Location', value: profile.location, href: null, icon: MapPin },
]

const SOCIALS = socials.filter((s) => !['mail', 'phone'].includes(s.icon))

const iconMap = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  instagram: InstagramIcon,
  file: FileText,
}

const hoverMap = {
  github: 'hover:bg-zinc-800 hover:text-white',
  linkedin: 'hover:bg-[#0a66c2] hover:text-white',
  instagram: 'hover:bg-gradient-to-br hover:from-[#f58529] hover:via-[#dd2a7b] hover:to-[#8134af] hover:text-white',
  file: 'hover:bg-orange-500 hover:text-white',
}

const inputClass =
  'w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-cream/40 outline-none backdrop-blur transition-colors focus:border-aqua-300 focus:bg-white/15'

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (sent) setSent(false)
  }

  const submit = (e) => {
    e.preventDefault()
    const name = form.name.trim()
    const email = form.email.trim()
    const message = form.message.trim()

    if (!name || !message) {
      setError('Please add your name and a message.')
      return
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setError('')
    setSent(true)

    const subject = `Portfolio message from ${name}${email ? ` (${email})` : ''}`
    const body = `Hi Shimul,\n\n${message}\n\n— ${name}${email ? `\n${email}` : ''}`
    openGmailCompose({ subject, body })
  }

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 py-24"
    >
      <VeilRays />
      {/* WebGL fluid background (adapted from WebGL-Fluid-Simulation, MIT) */}
      <FluidBackground variant="contact" />
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
        className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqua-500/15 blur-3xl"
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
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-14 text-center"
        >
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-aqua-300">
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

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Direct contact */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8"
          >
            <div className="space-y-5">
              {DIRECT.map((row) => {
                const Icon = row.icon
                const body = (
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-aqua-200">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-aqua-200/80">{row.label}</p>
                      <p className="truncate text-cream">{row.value}</p>
                    </div>
                  </div>
                )
                return row.href ? (
                  <a key={row.label} href={row.href} className="block transition-opacity hover:opacity-80">
                    {body}
                  </a>
                ) : (
                  <div key={row.label}>{body}</div>
                )
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {SOCIALS.map((s, i) => {
                const Icon = iconMap[s.icon]
                return (
                  <motion.a
                    key={s.name}
                    href={s.url}
                    target={s.url.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
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

          {/* Send a Message */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8"
          >
            <div className="mb-5 flex items-center gap-2">
              <MessageSquareText size={18} className="text-aqua-300" />
              <h3 className="text-lg font-bold text-white">Send a Message</h3>
            </div>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={28} />
                </span>
                <p className="text-lg font-bold text-white">Gmail is opening!</p>
                <p className="max-w-xs text-sm text-cream/70">
                  Your message is pre-filled — just hit send. If nothing opened, email me directly at{' '}
                  <a href={`mailto:${profile.email}`} className="font-semibold text-aqua-300 underline">
                    {profile.email}
                  </a>.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-2 rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-cream/80 transition-colors hover:border-aqua-300 hover:text-white"
                >
                  Write another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-1.5 block text-xs font-medium text-cream/70">
                      Your name *
                    </label>
                    <input
                      id="contact-name"
                      value={form.name}
                      onChange={setField('name')}
                      placeholder="John Doe"
                      autoComplete="name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-1.5 block text-xs font-medium text-cream/70">
                      Your email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={setField('email')}
                      placeholder="john@example.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-xs font-medium text-cream/70">
                    Message *
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    value={form.message}
                    onChange={setField('message')}
                    placeholder="Hi Shimul, I'd love to work with you on..."
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-300">
                    {error}
                  </p>
                )}

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-aqua-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-aqua-600/30 transition-colors hover:bg-aqua-700"
                >
                  <Send size={16} />
                  Send via Gmail
                </motion.button>
                <p className="text-center text-xs text-cream/50">
                  Opens Gmail with your message pre-filled — no backend needed, delivered straight to{' '}
                  <span className="text-cream/80">{profile.email}</span>.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Contact
