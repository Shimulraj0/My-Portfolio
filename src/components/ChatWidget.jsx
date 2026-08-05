import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, MessageCircle, Send, X, Sparkles } from 'lucide-react'
import { profile } from '../data.js'
import { aiEnabled, getBotReply, suggestedQuestions } from '../chatbot.js'
import { WhatsAppIcon } from './BrandIcons.jsx'

const press = { whileTap: { scale: 0.92 }, whileHover: { scale: 1.06 } }

function ChatMessage({ message }) {
  const isBot = message.role === 'bot'
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isBot
            ? 'rounded-tl-sm border border-zinc-100 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
            : 'rounded-tr-sm bg-terracotta-600 text-white'
        }`}
      >
        {message.text}
      </div>
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
            text: `Hi there! 👋 I'm an AI assistant answering on behalf of ${profile.name}. Ask me anything about his skills, projects, or how to reach him.`,
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
            className="flex h-[26rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-2xl shadow-zinc-900/15 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-3 border-b border-zinc-100 bg-gradient-to-r from-navy to-teal px-4 py-3.5 dark:border-zinc-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
                <Bot size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">Shimul&apos;s AI Assistant</p>
                <p className="flex items-center gap-1 text-[11px] text-terracotta-100">
                  {aiEnabled ? (
                    <>
                      <Sparkles size={11} />
                      AI-powered · replies on his behalf
                    </>
                  ) : (
                    <>Online · replies on his behalf</>
                  )}
                </p>
              </div>
              <motion.button
                type="button"
                {...press}
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-full p-1.5 text-white transition-colors hover:bg-white/15"
              >
                <X size={16} />
              </motion.button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-zinc-50/60 p-4 dark:bg-zinc-950/40">
              {messages.map((m, i) => (
                <ChatMessage key={i} message={m} />
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm border border-zinc-100 bg-white px-3.5 py-3 dark:border-zinc-800 dark:bg-zinc-800">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                          className="h-1.5 w-1.5 rounded-full bg-terracotta-500"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 border-t border-zinc-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                {suggestedQuestions.map((q) => (
                  <motion.button
                    key={q}
                    type="button"
                    {...press}
                    onClick={() => send(q)}
                    className="rounded-full border border-terracotta-200 bg-terracotta-50 px-2.5 py-1 text-[11px] font-medium text-terracotta-700 dark:border-terracotta-500/40 dark:bg-terracotta-500/10 dark:text-terracotta-300"
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            )}

            <form
              className="flex items-center gap-2 border-t border-zinc-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about his work..."
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-800 outline-none transition-colors focus:border-terracotta-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <motion.button
                type="submit"
                {...press}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-600 text-white transition-colors hover:bg-terracotta-700"
              >
                <Send size={16} />
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
