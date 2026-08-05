import {
  Zap,
  Plug,
  Layers,
  BrainCircuit,
  Mic,
  Languages,
  Coffee,
  FileCode2,
  Terminal,
  RefreshCw,
  Shield,
  Code2,
  Cpu,
  Bot,
  Workflow,
  Database,
  Network,
  Atom,
  Wind,
  Activity,
  Move3d,
  Cloud,
  Gem,
  Hexagon,
  Braces,
  ScanEye,
  AppWindow,
  Gauge,
} from 'lucide-react'

function BrandIcon({ d, size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

const BRANDS = {
  flutter: {
    d: 'M14.314 0L2.3 12 6 15.7 21.684.013h-7.357zm.014 11.072L7.857 17.53l6.47 6.47H21.7l-6.46-6.468 6.46-6.46h-7.37z',
    color: 'text-sky-600 dark:text-sky-400',
    label: 'Flutter',
  },
  dart: {
    d: 'M4.105 4.105S9.158 1.58 11.684.316a3.079 3.079 0 0 1 1.481-.315c.766.047 1.677.788 1.677.788L24 9.948v9.789h-4.263V24H9.789l-9-9C.303 14.5 0 13.795 0 13.105c0-.319.18-.818.316-1.105l3.789-7.895zm.679.679v11.787c.002.543.021 1.024.498 1.508L10.204 23h8.533v-4.263L4.784 4.784zm12.055-.678c-.899-.896-1.809-1.78-2.74-2.643-.302-.267-.567-.468-1.07-.462-.37.014-.87.195-.87.195L6.341 4.105l10.498.001z',
    color: 'text-sky-500 dark:text-sky-300',
    label: 'Dart',
  },
  firebase: {
    d: 'M19.455 8.369c-.538-.748-1.778-2.285-3.681-4.569-.826-.991-1.535-1.832-1.884-2.245a146 146 0 0 0-.488-.576l-.207-.245-.113-.133-.022-.032-.01-.005L12.57 0l-.609.488c-1.555 1.246-2.828 2.851-3.681 4.64-.523 1.064-.864 2.105-1.043 3.176-.047.241-.088.489-.121.738-.209-.017-.421-.028-.632-.033-.018-.001-.035-.002-.059-.003a7.46 7.46 0 0 0-2.28.274l-.317.089-.163.286c-.765 1.342-1.198 2.869-1.252 4.416-.07 2.01.477 3.954 1.583 5.625 1.082 1.633 2.61 2.882 4.42 3.611l.236.095.071.025.003-.001a9.59 9.59 0 0 0 2.941.568q.171.006.342.006c1.273 0 2.513-.249 3.69-.742l.008.004.313-.145a9.63 9.63 0 0 0 3.927-3.335c1.01-1.49 1.577-3.234 1.641-5.042.075-2.161-.643-4.304-2.133-6.371m-7.083 6.695c.328 1.244.264 2.44-.191 3.558-1.135-1.12-1.967-2.352-2.475-3.665-.543-1.404-.87-2.74-.974-3.975.48.157.922.366 1.315.622 1.132.737 1.914 1.902 2.325 3.461zm.207 6.022c.482.368.99.712 1.513 1.028-.771.21-1.565.302-2.369.273a8 8 0 0 1-.373-.022c.458-.394.869-.823 1.228-1.279zm1.347-6.431c-.516-1.957-1.527-3.437-3.002-4.398-.647-.421-1.385-.741-2.194-.95.011-.134.026-.268.043-.4.014-.113.03-.216.046-.313.133-.689.332-1.37.589-2.025.099-.25.206-.499.321-.74l.004-.008c.177-.358.376-.719.61-1.105l.092-.152-.003-.001c.544-.851 1.197-1.627 1.942-2.311l.288.341c.672.796 1.304 1.548 1.878 2.237 1.291 1.549 2.966 3.583 3.612 4.48 1.277 1.771 1.893 3.579 1.83 5.375-.049 1.395-.461 2.755-1.195 3.933-.694 1.116-1.661 2.05-2.8 2.708-.636-.318-1.559-.839-2.539-1.599.79-1.575.952-3.28.479-5.072zm-2.575 5.397c-.725.939-1.587 1.55-2.09 1.856-.081-.029-.163-.06-.243-.093l-.065-.026c-1.49-.616-2.747-1.656-3.635-3.01-.907-1.384-1.356-2.993-1.298-4.653.041-1.19.338-2.327.882-3.379.316-.07.638-.114.96-.131l.084-.002c.162-.003.324-.003.478 0 .227.011.454.035.677.07.073 1.513.445 3.145 1.105 4.852.637 1.644 1.694 3.162 3.144 4.515z',
    color: 'text-amber-500',
    label: 'Firebase',
  },
  android: {
    d: 'M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z',
    color: 'text-green-500',
    label: 'Android',
  },
  git: {
    d: 'M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.6-.719.721-1.889.721-2.609 0-.719-.719-.719-1.879 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187',
    color: 'text-red-500',
    label: 'Git',
  },
  vscode: {
    d: 'M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z',
    color: 'text-sky-500',
    label: 'VS Code',
  },
  openai: {
    d: 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z',
    color: 'text-emerald-500',
    label: 'OpenAI',
  },
  macos: {
    d: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
    color: 'text-zinc-500 dark:text-zinc-300',
    label: 'macOS',
  },
  windows: {
    d: 'M0,0H11.377V11.372H0ZM12.623,0H24V11.372H12.623ZM0,12.623H11.377V24H0Zm12.623,0H24V24H12.623',
    color: 'text-sky-500',
    label: 'Windows',
  },
  vue: {
    d: 'M24 1.61h-9.94L12 5.157 9.94 1.61H0l12 20.78L24 1.61zM12 14.015L5.965 4.657h3.32L12 9.675l2.715-5.018h3.32L12 14.015z',
    color: 'text-green-500 dark:text-green-400',
    label: 'Vue.js',
  },
}

const GENERICS = {
  flutterflow: { Icon: Zap, color: 'text-sky-500', label: 'FlutterFlow' },
  rest: { Icon: Plug, color: 'text-accent', label: 'REST APIs' },
  mvvm: { Icon: Layers, color: 'text-accent', label: 'MVVM & Provider' },
  llm: { Icon: BrainCircuit, color: 'text-accent', label: 'LLMs' },
  langgraph: { Icon: Network, color: 'text-terracotta-500', label: 'LangGraph' },
  vision: { Icon: ScanEye, color: 'text-accent', label: 'Computer Vision' },
  aiapps: { Icon: AppWindow, color: 'text-terracotta-500', label: 'AI Apps' },
  system: { Icon: Gauge, color: 'text-teal', label: 'System Management' },
  automation: { Icon: Bot, color: 'text-accent', label: 'AI Automation' },
  n8n: { Icon: Workflow, color: 'text-pink-500', label: 'n8n' },
  voice: { Icon: Mic, color: 'text-terracotta-500', label: 'Voice AI' },
  translation: { Icon: Languages, color: 'text-accent', label: 'Translation' },
  react: { Icon: Atom, color: 'text-sky-500 dark:text-sky-400', label: 'React' },
  vite: { Icon: Zap, color: 'text-amber-500', label: 'Vite' },
  tailwind: { Icon: Wind, color: 'text-sky-500', label: 'Tailwind CSS' },
  gsap: { Icon: Activity, color: 'text-emerald-500', label: 'GSAP' },
  framer: { Icon: Move3d, color: 'text-blue-500', label: 'Framer Motion' },
  supabase: { Icon: Database, color: 'text-accent', label: 'Supabase' },
  cloudflare: { Icon: Cloud, color: 'text-orange-500', label: 'Cloudflare Workers' },
  gemini: { Icon: Gem, color: 'text-violet-500', label: 'Gemini API' },
  node: { Icon: Hexagon, color: 'text-green-500', label: 'Node.js' },
  python: { Icon: Braces, color: 'text-yellow-500 dark:text-yellow-400', label: 'Python' },
  java: { Icon: Coffee, color: 'text-orange-500', label: 'Java' },
  c: { Icon: FileCode2, color: 'text-blue-500', label: 'C' },
  bash: { Icon: Terminal, color: 'text-green-600', label: 'Bash' },
  rom: { Icon: RefreshCw, color: 'text-teal', label: 'AOSP ROMs' },
  bootloader: { Icon: Shield, color: 'text-teal', label: 'Bootloaders' },
  studio: { Icon: Code2, color: 'text-green-500', label: 'Android Studio' },
  hardware: { Icon: Cpu, color: 'text-teal', label: 'IT & Hardware' },
}

const RULES = [
  ['flutterflow', 'flutterflow'],
  ['flutter', 'flutter'],
  ['dart', 'dart'],
  ['firebase', 'firebase'],
  ['openai', 'openai'],
  ['langgraph', 'langgraph'],
  ['computer vision', 'vision'],
  ['ai apps', 'aiapps'],
  ['system management', 'system'],
  ['llm', 'llm'],
  ['automation', 'automation'],
  ['n8n', 'n8n'],
  ['voice', 'voice'],
  ['translation', 'translation'],
  ['rest', 'rest'],
  ['supabase', 'supabase'],
  ['cloudflare', 'cloudflare'],
  ['gemini', 'gemini'],
  ['node', 'node'],
  ['python', 'python'],
  ['react', 'react'],
  ['vue', 'vue'],
  ['vite', 'vite'],
  ['tailwind', 'tailwind'],
  ['gsap', 'gsap'],
  ['framer', 'framer'],
  ['mvvm', 'mvvm'],
  ['android studio', 'studio'],
  ['android', 'android'],
  ['aosp', 'rom'],
  ['bootload', 'bootloader'],
  ['bash', 'bash'],
  ['java', 'java'],
  ['vscode', 'vscode'],
  ['vs code', 'vscode'],
  ['git', 'git'],
  ['macos', 'macos'],
  ['windows', 'windows'],
  ['it support', 'hardware'],
  ['hardware', 'hardware'],
]

export function getTech(name) {
  const s = String(name).toLowerCase()
  if (s === 'c') return GENERICS.c
  for (const [key, id] of RULES) {
    if (s.includes(key)) {
      if (BRANDS[id]) return BRANDS[id]
      return GENERICS[id]
    }
  }
  return null
}

export function techColor(name) {
  return getTech(name)?.color ?? 'text-muted'
}

export function TechIcon({ name, size = 18, className = '' }) {
  const tech = getTech(name)
  if (!tech) return null
  if (tech.d) {
    return <BrandIcon d={tech.d} size={size} className={`${tech.color} ${className}`} />
  }
  const Lucide = tech.Icon
  return <Lucide size={size} className={`${tech.color} ${className}`} />
}
