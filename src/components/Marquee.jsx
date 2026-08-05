import { skills } from '../data.js'
import { TechIcon } from './TechIcons.jsx'

const ITEMS = skills.flatMap((group) => group.items)

function Row({ ariaHidden }) {
  return (
    <div aria-hidden={ariaHidden} className="flex shrink-0 items-center gap-10 pr-10">
      {ITEMS.map((item) => (
        <span
          key={item}
          className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold tracking-wide text-zinc-500 dark:text-zinc-400"
        >
          <TechIcon name={item} size={16} />
          {item}
          <span className="ml-10 text-terracotta-400 dark:text-terracotta-500">✦</span>
        </span>
      ))}
    </div>
  )
}

function Marquee() {
  return (
    <div className="marquee relative overflow-hidden border-y border-zinc-200/70 bg-white/40 py-4 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
      <div className="marquee-track">
        <Row ariaHidden={false} />
        <Row ariaHidden={true} />
      </div>
    </div>
  )
}

export default Marquee
