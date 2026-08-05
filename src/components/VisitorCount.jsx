import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye } from 'lucide-react'

const API = 'https://shimul-ai.shimulraj0.workers.dev'

function VisitorCount() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let active = true
    fetch(`${API}/api/visit`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((d) => {
        if (active && typeof d.visits === 'number') setCount(d.visits)
      })
      .catch(() => {
        if (active) setCount(null)
      })
    return () => {
      active = false
    }
  }, [])

  if (count === null) return null

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400"
      title="Visitors"
    >
      <Eye size={13} />
      {count.toLocaleString()} visits
    </motion.p>
  )
}

export default VisitorCount
