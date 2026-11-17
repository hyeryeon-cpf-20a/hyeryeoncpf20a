import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useInvite } from '../context'

export function Accordion({
  title,
  children,
  defaultOpen = false,
  right,
}: {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  right?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const { motionOn } = useInvite()
  const id = useId()
  return (
    <div className="soft-card overflow-hidden text-left">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="tap flex min-h-[52px] w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="text-[0.94rem]">{title}</span>
        <span className="flex items-center gap-3">
          {right}
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: motionOn ? 0.3 : 0 }}
            style={{ opacity: 0.55 }}
          >
            <path d="M6 9l6 6 6-6" />
          </motion.svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: motionOn ? 0.35 : 0, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="px-5 pb-5">
              <div className="mb-4 h-px w-full" style={{ background: 'var(--c-text)', opacity: 0.08 }} />
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
