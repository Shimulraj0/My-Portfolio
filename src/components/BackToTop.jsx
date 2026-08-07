import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

const press = { whileTap: { scale: 0.9 }, whileHover: { scale: 1.08 } }

function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 480)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.a
          href="#home"
          aria-label="Back to top"
          {...press}
          initial={{ opacity: 0, y: 16, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-24 right-5 z-[80] flex h-11 w-11 items-center justify-center rounded-full border border-aqua-300/60 bg-white/80 text-aqua-700 shadow-lg shadow-aqua-500/20 backdrop-blur-md transition-colors hover:bg-aqua-600 hover:text-white dark:border-aqua-500/40 dark:bg-zinc-900/80 dark:text-aqua-400 dark:hover:bg-aqua-600 dark:hover:text-white sm:bottom-28 sm:right-6"
        >
          <ArrowUp size={18} />
        </motion.a>
      )}
    </AnimatePresence>
  )
}

export default BackToTop
