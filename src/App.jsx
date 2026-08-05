import { lazy, Suspense, useEffect, useRef } from 'react'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import AuroraBackground from './components/AuroraBackground.jsx'
import CursorGlow from './components/CursorGlow.jsx'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const About = lazy(() => import('./components/About.jsx'))
const Skills = lazy(() => import('./components/Skills.jsx'))
const Projects = lazy(() => import('./components/Projects.jsx'))
const Contact = lazy(() => import('./components/Contact.jsx'))
const Footer = lazy(() => import('./components/Footer.jsx'))
const ChatWidget = lazy(() => import('./components/ChatWidget.jsx'))

function ScrollReveal() {
  const ref = useRef(null)

  useEffect(() => {
    const elements = ref.current?.querySelectorAll('.reveal-up, .reveal-left, .reveal-right')
    if (!elements?.length) return

    elements.forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => el.classList.add('revealed'),
      })
    })

    return () => ScrollTrigger.getAll().forEach(st => st.kill())
  }, [])

  return null
}

function App() {
  return (
    <div className="relative min-h-screen bg-cream text-navy transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
      <AuroraBackground />
      <ScrollReveal />
      <CursorGlow />
      <div className="relative z-10">
      <Navbar />
      <main>
        <Hero />
        <Suspense fallback={null}>
          <About />
        </Suspense>
        <Suspense fallback={null}>
          <Skills />
        </Suspense>
        <Suspense fallback={null}>
          <Projects />
        </Suspense>
        <Suspense fallback={null}>
          <Contact />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
      </div>
    </div>
  )
}

export default App
