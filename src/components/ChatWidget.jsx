import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Terminal, MessageCircle, Send, X } from 'lucide-react'
import { profile } from '../data.js'
import { aiEnabled, getBotReply, suggestedQuestions } from '../chatbot.js'
import { WhatsAppIcon } from './BrandIcons.jsx'

const press = { whileTap: { scale: 0.92 }, whileHover: { scale: 1.06 } }

function ChatMessage({ message }) {
  const isBot = message.role === 'bot'
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap leading-relaxed ${
          isBot ? 'text-zinc-300' : 'text-right text-zinc-100'
        }`}
      >
        <span
          className={`mr-2 select-none font-bold ${isBot ? 'text-terracotta-400' : 'text-emerald-400'}`}
        >
          {isBot ? '▸' : '$'}
        </span>
        {message.text}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start font-mono text-zinc-300">
      <span className="mr-2 select-none text-terracotta-400">▸</span>
      <span className="term-caret inline-block h-3.5 w-2 translate-y-0.5 bg-terracotta-400" />
    </div>
  )
}

function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setTyping(true)
      const t = setTimeout(() => {
        setTyping(false)
        setMessages([
          {
            role: 'bot',
            text: `Hi there! I'm an AI assistant answering on behalf of ${profile.name}. Ask me anything about his skills, projects, or how to reach him.`,
          },
        ])
      }, 700)
      return () => clearTimeout(t)
    }
  }, [open, messages.length])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open, messages.length])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const send = (text) => {
    const question = (text ?? input).trim()
    if (!question || typing) return
    setInput('')
    const userMessage = { role: 'user', text: question }
    setMessages((m) => [...m, userMessage])
    setTyping(true)
    getBotReply(question, messages.concat(userMessage)).then((reply) => {
      setTyping(false)
      setMessages((m) => [...m, { role: 'bot', text: reply }])
    })
  }

  const whatsappUrl = `https://wa.me/${profile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi ${profile.name}! I found your portfolio and I'd like to get in touch.`,
  )}`

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex h-[26rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-950 font-mono shadow-2xl shadow-black/50"
          >
            <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
              <div className="flex shrink-0 gap-1.5" aria-hidden>
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Terminal size={13} className="shrink-0 text-terracotta-400" />
                <p className="truncate text-xs font-semibold text-zinc-200">
                  shimul-ai
                  <span className="ml-2 hidden text-[10px] font-normal text-zinc-500 sm:inline">
                    · {aiEnabled ? 'gemini worker' : 'offline'}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="dot-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  online
                </span>
                <motion.button
                  type="button"
                  {...press}
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <X size={15} />
                </motion.button>
              </div>
            </div>

            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-zinc-950 p-4 text-[13px]">
              {messages.map((m, i) => (
                <ChatMessage key={i} message={m} />
              ))}
              {typing && <TypingIndicator />}
            </div>

            {messages.length <= 1 && (
              <div className="border-t border-zinc-800 bg-zinc-900/60 px-3 py-2">
                <p className="mb-1.5 select-none px-1 text-[10px] tracking-wide text-zinc-500">
                  $ try one
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedQuestions.map((q) => (
                    <motion.button
                      key={q}
                      type="button"
                      {...press}
                      onClick={() => send(q)}
                      className="rounded-md border border-zinc-700/80 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:border-terracotta-500/60 hover:text-terracotta-300"
                    >
                      $ {q}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <form
              className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-950 px-3 py-2.5"
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
            >
              <span className="select-none text-sm font-bold text-emerald-400">$</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ask about his work…"
                aria-label="Ask the assistant"
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 caret-terracotta-400 outline-none placeholder:text-zinc-600"
              />
              <motion.button
                type="submit"
                {...press}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 text-terracotta-400 transition-colors hover:border-terracotta-500 hover:bg-terracotta-500/10"
              >
                <Send size={15} />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <motion.a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          {...press}
          aria-label="Chat on WhatsApp"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/40"
        >
          <WhatsAppIcon size={28} />
        </motion.a>
        <motion.button
          type="button"
          {...press}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close chat' : 'Open chat'}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-terracotta-500 to-navy text-white shadow-xl shadow-terracotta-600/40"
        >
          {open ? <X size={24} /> : <MessageCircle size={24} />}
        </motion.button>
      </div>
    </div>
  )
}

export default ChatWidget
