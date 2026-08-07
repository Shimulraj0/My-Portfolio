import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ease = [0.16, 1, 0.3, 1]

/**
 * Apple-style "hello" loading animation — dark obsidian edition.
 *
 * Asset taken from CodePen "Apple hello" by steefmaster
 * (https://codepen.io/steefmaster/pen/MWvdyGb): the word "hello" is hand-drawn
 * via an SVG stroke-dashoffset animation. Recolored to the site's obsidian +
 * aqua identity: the hello strokes in a cyan→sky→teal gradient over a deep
 * navy background, with a soft aqua glow.
 *
 * Exit is an opaque curtain slide-up (never a see-through opacity fade), so the
 * animation plays fully on a solid screen and the portfolio is *entered*
 * underneath. `onDone` fires the moment the curtain starts lifting so the app
 * can choreograph its entrance animations in sync.
 */

// Hand-drawn "hello" path (verbatim from the CodePen asset).
const HELLO_PATH =
  'M-293.58-104.62S-103.61-205.49-60-366.25c9.13-32.45,9-58.31,0-74-10.72-18.82-49.69-33.21-75.55,31.94-27.82,70.11-52.22,377.24-44.11,322.48s34-176.24,99.89-183.19c37.66-4,49.55,23.58,52.83,47.92a117.06,117.06,0,0,1-3,45.32c-7.17,27.28-20.47,97.67,33.51,96.86,66.93-1,131.91-53.89,159.55-84.49,31.1-36.17,31.1-70.64,19.27-90.25-16.74-29.92-69.47-33-92.79,16.73C62.78-179.86,98.7-93.8,159-81.63S302.7-99.55,393.3-269.92c29.86-58.16,52.85-114.71,46.14-150.08-7.44-39.21-59.74-54.5-92.87-8.7-47,65-61.78,266.62-34.74,308.53S416.62-58,481.52-130.31s133.2-188.56,146.54-256.23c14-71.15-56.94-94.64-88.4-47.32C500.53-375,467.58-229.49,503.3-127a73.73,73.73,0,0,0,23.43,33.67c25.49,20.23,55.1,16,77.46,6.32a111.25,111.25,0,0,0,30.44-19.87c37.73-34.23,29-36.71,64.58-127.53C724-284.3,785-298.63,821-259.13a71,71,0,0,1,13.69,22.56c17.68,46,6.81,80-6.81,107.89-12,24.62-34.56,42.72-61.45,47.91-23.06,4.45-48.37-.35-66.48-24.27a78.88,78.88,0,0,1-12.66-25.8c-14.75-51,4.14-88.76,11-101.41,6.18-11.39,37.26-69.61,103.42-42.24,55.71,23.05,100.66-23.31,100.66-23.31'

// Obsidian gradient (deep navy top → near-black base).
const OBSIDIAN_BG =
  'radial-gradient(130% 90% at 50% 0%, #0e2036 0%, #0a1424 48%, #05080f 100%)'

function IntroPreloader({ onDone }) {
  const [phase, setPhase] = useState('show') // show -> hide (curtain up) -> gone
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    // Respect reduced motion: skip straight to the site.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('gone')
      onDoneRef.current?.()
      return undefined
    }

    const hideTimer = setTimeout(() => {
      setPhase('hide') // start the curtain slide-up
      onDoneRef.current?.() // let the app begin its entrance as the curtain lifts
    }, 3050) // draw (~2.6s) + brief hold
    const goneTimer = setTimeout(() => setPhase('gone'), 4000)
    return () => {
      clearTimeout(hideTimer)
      clearTimeout(goneTimer)
    }
  }, [])

  // Lock scroll while the preloader is on screen.
  useEffect(() => {
    if (phase !== 'gone') {
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = ''
      }
    }
    return undefined
  }, [phase])

  return (
    <AnimatePresence>
      {phase !== 'gone' && (
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: phase === 'hide' ? '-100%' : 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.95, ease }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: OBSIDIAN_BG }}
        >
          <div className="w-full max-w-[620px] px-6">
            <svg
              className="apple-hello w-full"
              viewBox="0 0 1230.94 414.57"
              role="img"
              aria-label="hello"
            >
              <defs>
                <linearGradient id="hello-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="55%" stopColor="#7dd3fc" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
              <path
                d={HELLO_PATH}
                transform="translate(311.08 476.02)"
                style={{
                  fill: 'none',
                  stroke: 'url(#hello-stroke)',
                  strokeLinecap: 'round',
                  strokeMiterlimit: 10,
                  strokeWidth: 35,
                  filter: 'drop-shadow(0 0 28px rgba(34, 211, 238, 0.35))',
                }}
              />
            </svg>
          </div>

          {/* Hand-drawn stroke animation (from the CodePen asset) */}
          <style>{`
            .apple-hello path {
              stroke-dasharray: 5800px;
              stroke-dashoffset: 5800px;
              animation: apple-hello-draw 2.6s cubic-bezier(0.45, 0, 0.35, 1) forwards;
            }
            @keyframes apple-hello-draw {
              0%   { stroke-dashoffset: 5800px; }
              10%  { stroke-dashoffset: 5800px; }
              100% { stroke-dashoffset: 0px; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default IntroPreloader
