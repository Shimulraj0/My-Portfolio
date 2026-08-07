const MODEL = 'gemini-3.5-flash'
// Localhost entries keep the dev server (vite:5173) and Docker preview working
const ALLOWED_ORIGINS = [
  'https://shimulraj0.github.io',
  'https://shimul.is-a.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
]
const KV_KEY = 'visits'

const SYSTEM_PROMPT = `
You are a friendly, professional AI assistant that represents Shimul Raj Das, a Flutter Developer based in Dhaka, Bangladesh.
Answer visitors' questions about him using ONLY the facts below. Be concise (max ~120 words), warm, and use plain text (no markdown headings).
If asked something not in the facts, say you're not sure and offer to share his contact info.

FACTS:
- Role: Flutter Developer; also explores AI & LLMs, Android tweaking, and tech tinkering.
- Location: Dhaka, Bangladesh. Email: shimulrajdas001@gmail.com. Phone: +8801575204054.
- Resume: https://drive.google.com/file/d/1LctFc_qvs4Vzz2jEEPzfecsT8FcMVdYT/view?usp=sharing
- GitHub: https://github.com/Shimulraj0 | LinkedIn: https://www.linkedin.com/in/shimulrajdas001/
- Instagram: https://www.instagram.com/0_shimul.raj_0/
- Education: Diploma in Engineering (CST) from Shariatpur Polytechnic Institute (Session 2021-22, CGPA 3.50).
- Experience: Junior Flutter Developer at Sparktech Agency (Under Betopia Ltd), Dec 2025 - Apr 2026.
- Skills: cross-platform (Flutter, Dart, Firebase), state management (Provider, GetX, Riverpod), UI (Material Design, Cupertino, custom widgets, animations), backend (REST APIs, Node.js basics).
- Projects (Flutter apps): Find Med, TaskEase, Gran Guide, Wonderland, Peptide AI, Football AI, Auto Intel, Bluetooth Media Player.
- He is open to Flutter work, AI experiments, and tech collaborations.
`

function cors(origin) {
  // Only echo the origin when it is explicitly allowed. When the origin is
  // absent (curl, same-origin) or unknown (a random site), we omit the header
  // so the browser enforces the deny instead of a confusing fallback echo.
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

async function getVisits(env) {
  const raw = await env.VISITS.get(KV_KEY)
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

async function bumpVisits(env) {
  const next = (await getVisits(env)) + 1
  await env.VISITS.put(KV_KEY, String(next))
  return next
}

async function handleChat(request, env, headers) {
  if (!env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ reply: 'The assistant is not configured yet. Please try again later.' }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } },
    )
  }
  try {
    const { messages } = await request.json()
    const contents = (messages || [])
      .slice(-10)
      .map((m) => ({ role: m.role === 'bot' ? 'model' : 'user', parts: [{ text: m.text }] }))
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
      }),
    })
      if (!res.ok) {
        const upstream = await res.text()
        return new Response(
          JSON.stringify({ reply: null, error: 'upstream', status: res.status, upstream: upstream.slice(0, 500) }),
          { status: 502, headers: { ...headers, 'Content-Type': 'application/json' } },
        )
      }
      const raw = await res.text()
      let data = null
      try {
        data = JSON.parse(raw)
      } catch {
        return new Response(
          JSON.stringify({ reply: null, error: 'bad-json', status: res.status, raw: raw.slice(0, 500) }),
          { status: 502, headers: { ...headers, 'Content-Type': 'application/json' } },
        )
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    return new Response(
      JSON.stringify({ reply: text?.trim() || null, error: text ? null : 'empty' }),
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    )
    } catch (err) {
      const msg = err?.message || String(err)
      const cause = err?.cause?.message || err?.cause?.code || ''
      return new Response(JSON.stringify({ reply: null, error: 'internal', message: msg, cause }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }
}

export default {
  async fetch(request, env) {
    const headers = cors(request.headers.get('Origin'))

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    const url = new URL(request.url)

    if (url.pathname === '/api/count' && request.method === 'GET') {
      const visits = await getVisits(env)
      return new Response(JSON.stringify({ visits }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (url.pathname === '/api/visit' && request.method === 'POST') {
      const visits = await bumpVisits(env)
      return new Response(JSON.stringify({ visits }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (request.method === 'POST' && (url.pathname === '/' || url.pathname === '/chat')) {
      return handleChat(request, env, headers)
    }

    return new Response('Not Found', { status: 404, headers })
  },
}
