import { lazy, Suspense, useEffect, useRef } from 'react'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Skills from './components/Skills.jsx'
import Projects from './components/Projects.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'
import ChatWidget from './components/ChatWidget.jsx'

const ParticleField = lazy(() => import('./components/ParticleField.jsx'))

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

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
      <Suspense fallback={null}>
        <ParticleField />
      </Suspense>
      <ScrollReveal />
      <div className="relative z-10">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <Footer />
      <ChatWidget />
      </div>
    </div>
  )
}

export default App
