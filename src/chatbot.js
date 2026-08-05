import { profile, skills, projects } from './data.js'

const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL

const lower = (s) => s.toLowerCase()

const match = (input, words) => words.some((w) => lower(input).includes(lower(w)))

const projectLine = (p) =>
  `- **${p.title}** (${p.tag}): ${p.description} — ${p.features.join(', ')}. Repo: ${p.url}`

export const aiEnabled = Boolean(PROXY_URL)

export async function getBotReply(input, history = []) {
  if (PROXY_URL) {
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.concat({ role: 'user', text: input }) }),
      })
      const data = await res.json()
      if (res.ok && data?.reply && data.reply.trim()) return data.reply.trim()
      console.warn('AI proxy returned no answer, using local reply')
    } catch (err) {
      console.warn('AI proxy failed, falling back to local replies:', err.message)
    }
  }
  return replyFor(input)
}

function replyFor(input) {
  if (match(input, ['hi', 'hello', 'hey', 'salam', 'assalam', 'good morning', 'good afternoon', 'good evening'])) {
    return `Hello! 👋 I'm the virtual assistant for ${profile.name}. Ask me about his skills, projects, experience, or how to get in touch.`
  }

  if (match(input, ['skill', 'tech', 'stack', 'language', 'know', 'flutter', 'dart'])) {
    const lines = skills.map((g) => `- **${g.group}**: ${g.items.join(', ')}`).join('\n')
    return `Here's what ${profile.name} works with:\n\n${lines}`
  }

  if (match(input, ['project', 'app', 'work', 'portfolio', 'built', 'made', 'github'])) {
    const list = projects.map((p) => projectLine(p)).join('\n\n')
    return `He has built ${projects.length} Flutter apps so far:\n\n${list}`
  }

  if (match(input, ['experience', 'job', 'work history', 'worked', 'professional'])) {
    const exp = profile.experience.map(
      (e) => `- **${e.role}** — ${e.company} (${e.period})\n  ${e.highlights.join('; ')}`,
    ).join('\n')
    return `Professional experience:\n\n${exp}\n\nWant to know more about a specific project?`
  }

  if (match(input, ['education', 'study', 'degree', 'diploma', 'school', 'college', 'university'])) {
    return `Education: ${profile.education.degree} from ${profile.education.school} (Session ${profile.education.graduation}, CGPA ${profile.education.cgpa}).`
  }

  if (match(input, ['ai', 'llm', 'gpt', 'openai', 'voice', 'translation', 'bengali'])) {
    return `${profile.name} loves AI & LLMs — he explores GPT/OpenAI APIs, builds AI voice apps, and works on Bengali–English translation with LLMs. His current focus is a voice-controlled AI app built in Flutter.`
  }

  if (match(input, ['android', 'rom', 'root', 'flash', 'hackintosh', 'macos', 'hardware', 'tinker'])) {
    return `Beyond Flutter, ${profile.name} is an Android enthusiast — flashing AOSP ROMs, recoveries and bootloaders — and he built his own Hackintosh (macOS on PC) for fun. He also enjoys IT support and hardware troubleshooting.`
  }

  if (match(input, ['contact', 'email', 'phone', 'call', 'mail', 'hire', 'reach', 'whatsapp', 'instagram', 'dm'])) {
    return `You can reach ${profile.name} directly:\n- Email: ${profile.email}\n- Phone: ${profile.phone}\n- GitHub: ${profile.github}\n- LinkedIn: ${profile.linkedin}\n- Instagram: https://www.instagram.com/0_shimul.raj_0/\n\nHe usually replies fast!`
  }

  if (match(input, ['resume', 'cv', 'download', 'hire'])) {
    return `Here's his resume: ${profile.resume}`
  }

  if (match(input, ['available', 'freelance', 'work with', 'open to', 'hire'])) {
    return `Yes! ${profile.name} is open to Flutter work, AI experiments, and tech collaborations. Drop him an email at ${profile.email} or message him on WhatsApp — he'll get back to you.`
  }

  if (match(input, ['name', 'who are you', 'who is'])) {
    return `I'm a little assistant that represents ${profile.name}, a Flutter Developer, AI & LLM explorer, and Android tinkerer based in ${profile.location}.`
  }

  if (match(input, ['location', 'where', 'based', 'from'])) {
    return `${profile.name} is based in ${profile.location}.`
  }

  if (match(input, ['thank', 'thanks', 'ty'])) {
    return `You're welcome! 😊 Anything else you'd like to know about ${profile.name}?`
  }

  if (match(input, ['bye', 'goodbye', 'see you'])) {
    return `Goodbye! Thanks for visiting. If you'd like to chat further, use the WhatsApp button below. 👋`
  }

  return `I can answer about ${profile.name}'s skills, projects, experience, education, and contact info. Try asking "What are his skills?" or "Show me his projects".`
}

export const suggestedQuestions = [
  'What are his skills?',
  'Show me his projects',
  'What experience does he have?',
  'How can I contact him?',
]
