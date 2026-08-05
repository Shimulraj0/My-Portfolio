export const profile = {
  name: 'Shimul Raj Das',
  role: 'Flutter Developer',
  tagline: ['Flutter Developer', 'AI & LLM Explorer', 'Android Tweaker', 'macOS Installer', 'Tech Enthusiast'],
  location: 'Dhaka, Bangladesh',
  email: 'shimulrajdas001@gmail.com',
  phone: '+8801575204054',
  resume:
    'https://drive.google.com/file/d/1LctFc_qvs4Vzz2jEEPzfecsT8FcMVdYT/view?usp=sharing',
  github: 'https://github.com/Shimulraj0',
  linkedin: 'https://www.linkedin.com/in/shimul-raj-das-587847369',
  photo: './shi.jpg',
  education: {
    degree: 'Diploma in Engineering (CST)',
    school: 'Shariatpur Polytechnic Institute',
    graduation: '2021–22',
    cgpa: '3.50',
  },
  experience: [
    {
      role: 'Junior Flutter Developer',
      company: 'Sparktech Agency (Under Betopia Ltd)',
      period: 'Dec 2025 – Apr 2026',
      highlights: [
        'Developed cross-platform mobile apps with Flutter',
        'Converted Figma & FlutterFlow designs into responsive UIs',
        'Integrated REST APIs and backend services',
      ],
    },
  ],
  about: [
    'I am a Flutter developer who loves turning ideas into polished mobile apps. Right now I am building a voice-controlled AI app and exploring LLMs for Bengali-English translation.',
    'Beyond code, I am an Android enthusiast — flashing AOSP ROMs, recoveries, and bootloaders — and I built my own Hackintosh (macOS on PC) for the fun of it.',
    'I enjoy IT support, hardware troubleshooting, and learning cross-platform development and smart automation.',
  ],
}

export const skills = [
  {
    group: 'Mobile & App Development',
    icon: 'smartphone',
    items: ['Flutter', 'Dart', 'Firebase', 'FlutterFlow', 'MVVM & Provider'],
  },
  {
    group: 'AI & Language Models',
    icon: 'brain',
    items: ['OpenAI GPT API', 'LLM Applications', 'LangGraph', 'AI Automation', 'n8n Workflows', 'Computer Vision', 'AI Apps', 'AI Voice Apps', 'Bengali–English Translation'],
  },
  {
    group: 'Web & Frontend',
    icon: 'globe',
    items: ['React', 'Vue.js', 'Vite', 'Tailwind CSS', 'GSAP', 'Framer Motion'],
  },
  {
    group: 'Backend & APIs',
    icon: 'server',
    items: ['REST APIs', 'Supabase', 'Cloudflare Workers', 'Gemini API', 'Node.js'],
  },
  {
    group: 'Programming & Systems',
    icon: 'terminal',
    items: ['Java', 'C', 'Python', 'Bash', 'Android SDK', 'AOSP ROM Flashing', 'Bootloaders & Recoveries'],
  },
  {
    group: 'Tools & Platforms',
    icon: 'wrench',
    items: ['Android Studio', 'VS Code', 'Git & GitHub', 'GitHub Pages', 'macOS', 'Windows', 'System Management', 'IT Support & Hardware'],
  },
]

export const categories = [
  { id: 'all', label: 'All' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'ai', label: 'AI' },
  { id: 'health', label: 'Health' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'wearables', label: 'Wearables' },
]

export const projects = [
  {
    id: 'medfinder',
    featured: true,
    title: 'Find Med',
    repo: 'FindMed',
    category: 'health',
    tag: 'Health',
    screenshot: './screenshots/medfinder.png',
    url: 'https://github.com/Shimulraj0/FindMed',
    description:
      'Bangladesh medicine finder — search DIMS & MedEx catalogs for local and imported medicines, with brand alternatives and quick details.',
    features: ['DIMS & MedEx search', 'Brand alternatives', 'Fast results'],
    screenshots: [
      './screenshots/medfinder/splash.png',
      './screenshots/medfinder/search.png',
      './screenshots/medfinder/results.png',
    ],
  },
  {
    id: 'auto-intel',
    title: 'Auto Intel',
    repo: 'AI_CAR_MAINTAINANCE',
    category: 'ai',
    tag: 'AI',
    screenshot: './screenshots/auto-intel.png',
    url: 'https://github.com/Shimulraj0/AI_CAR_MAINTAINANCE',
    description:
      'AI-powered car maintenance companion. Diagnoses vehicle issues, tracks maintenance schedules, warns when service is due, and stores inspection reports.',
    features: ['AI vehicle diagnosis', 'Maintenance reminders', 'Report import & history'],
    screenshots: [
      './screenshots/auto-intel/onboarding.png',
      './screenshots/auto-intel/login.png',
      './screenshots/auto-intel/signup.png',
    ],
  },
  {
    id: 'football-ai',
    title: 'Football AI',
    repo: 'Football-AI',
    category: 'ai',
    tag: 'AI',
    screenshot: './screenshots/football-ai.png',
    url: 'https://github.com/Shimulraj0/Football-AI',
    description:
      'A full club-management platform for football academies — age groups, tryouts, curriculum engine, coach AI assistant, attendance, billing, and analytics dashboards.',
    features: ['Club Command Center', 'AI assistant & analytics', 'Tryout scoring & placement'],
    screenshots: [
      './screenshots/football-ai/welcome.png',
      './screenshots/football-ai/login.png',
      './screenshots/football-ai/roles.png',
      './screenshots/football-ai/command-center.png',
    ],
  },
  {
    id: 'taskapp',
    title: 'Task App',
    repo: 'TASK_APP',
    category: 'productivity',
    tag: 'Utility',
    screenshot: './screenshots/taskapp.png',
    url: 'https://github.com/Shimulraj0/TASK_APP',
    description:
      'A clean task-management application for organizing daily work and student records, with forms and list management built in Flutter.',
    features: ['Task & list management', 'Form handling', 'Lightweight & fast'],
    screenshots: [
      './screenshots/taskapp/login.png',
      './screenshots/taskapp/getstarted.png',
      './screenshots/taskapp/home.png',
      './screenshots/taskapp/profile.png',
    ],
  },
  {
    id: 'gran-guide',
    title: 'Gran Guide',
    repo: 'Gran-Guide-App',
    category: 'productivity',
    tag: 'Safety',
    screenshot: './screenshots/gran-guide.png',
    url: 'https://github.com/Shimulraj0/Gran-Guide-App',
    description:
      'Digital safety and education app for seniors — guides on staying safe on Facebook & WhatsApp, call blocking, FAQ, and subscription-based protection plans.',
    features: ['Online safety guides', 'Call protection', 'Subscription plans'],
    screenshots: [
      './screenshots/gran-guide/welcome.png',
      './screenshots/gran-guide/mission.png',
      './screenshots/gran-guide/auth.png',
      './screenshots/gran-guide/signup.png',
    ],
  },
  {
    id: 'peptide',
    title: 'Peptide Tracker',
    repo: 'Peptide',
    category: 'health',
    tag: 'Health',
    screenshot: './screenshots/peptide.png',
    url: 'https://github.com/Shimulraj0/Peptide',
    description:
      'A health tracker for peptide protocols with built-in protocol presets (like BPC-157), push notifications, activity logs, and personal settings.',
    features: ['Protocol presets', 'Push notifications', 'Activity tracking'],
    screenshots: [
      './screenshots/peptide/splash.png',
      './screenshots/peptide/login.png',
      './screenshots/peptide/signup.png',
    ],
  },
  {
    id: 'wonderland',
    title: 'Wonder Tales Hub',
    repo: 'wonderland',
    category: 'entertainment',
    tag: 'Kids',
    screenshot: './screenshots/wonderland.png',
    url: 'https://github.com/Shimulraj0/wonderland',
    description:
      'A delightful storybook app for children with interactive tales like "Emma & the Pirate Treasure", an onboarding flow, and a colorful reading experience.',
    features: ['Interactive stories', 'Onboarding experience', 'Kid-friendly UI'],
    screenshots: [
      './screenshots/wonderland/onboarding.png',
      './screenshots/wonderland/login.png',
      './screenshots/wonderland/signup.png',
    ],
  },
  {
    id: 'bluetooth',
    title: 'Wearable Media Player',
    repo: 'Bluetooth-Media-Player',
    category: 'wearables',
    tag: 'Wearable',
    screenshot: './screenshots/bluetooth.png',
    url: 'https://github.com/Shimulraj0/Bluetooth-Media-Player',
    description:
      'A wearable prototype media player that connects to Bluetooth devices — device pairing, playback control, and settings tuned for small screens.',
    features: ['Bluetooth device connection', 'Media playback control', 'Wearable-first UI'],
    screenshots: [
      './screenshots/bluetooth/bluetooth.png',
      './screenshots/bluetooth/contacts.png',
      './screenshots/bluetooth/media.png',
      './screenshots/bluetooth/settings.png',
    ],
  },
]

export const socials = [
  {
    name: 'GitHub',
    url: profile.github,
    icon: 'github',
  },
  {
    name: 'LinkedIn',
    url: profile.linkedin,
    icon: 'linkedin',
  },
  {
    name: 'Email',
    url: `mailto:${profile.email}`,
    icon: 'mail',
  },
  {
    name: 'Phone',
    url: `tel:${profile.phone}`,
    icon: 'phone',
  },
  {
    name: 'Personal DM',
    url: 'https://www.instagram.com/0_shimul.raj_0/',
    icon: 'instagram',
  },
  {
    name: 'Resume',
    url: profile.resume,
    icon: 'file',
  },
]
