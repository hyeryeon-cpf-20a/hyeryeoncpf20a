import { useEffect, useRef, useState } from 'react'
import { animate, motion } from 'framer-motion'
import type { SectionOf } from '../lib/types'
import { formatEnDate, parseWedding } from '../lib/date'
import { WaxSeal } from './WaxSeal'
import { useInvite } from './context'

interface Props {
  section: SectionOf<'envelope'>
  onOpened: () => void
  /** 관리자 미리보기에서 다시 재생할 때 증가 */
  replayKey?: number
}

const EASE = [0.65, 0, 0.35, 1] as const
const SOFT = [0.22, 0.61, 0.36, 1] as const

/**
 * 실링왁스 봉투 오프닝
 * 1) 왁스가 눌림 → 2) 봉인 해제(떨어짐) → 3) 덮개 열림 → 4) 카드 상승 → 5) 카드 확대 → 6) 다음 섹션
 */
export function Envelope({ section, onOpened }: Props) {
  const { content, motionOn } = useInvite()
  const s = section.settings
  const [phase, setPhase] = useState<'idle' | 'opening' | 'done'>('idle')
  const root = useRef<HTMLDivElement>(null)
  const env = useRef<HTMLDivElement>(null)
  const seal = useRef<HTMLButtonElement>(null)
  const flap = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const pocket = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLParagraphElement>(null)
  const date = parseWedding(content.wedding)
  const k = 1 / Math.max(0.3, (s.speed || 1) * (content.animation.speed || 1))

  useEffect(() => {
    // 봉투가 떠 있는 동안 뒤 페이지 스크롤 잠금
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prev
    }
  }, [])

  async function open() {
    if (phase !== 'idle') return
    setPhase('opening')
    if (!motionOn) {
      await animate(root.current!, { opacity: 0 }, { duration: 0.45 })
      setPhase('done')
      onOpened()
      return
    }
    const sealEl = seal.current!
    const flapEl = flap.current!
    const cardEl = card.current!
    const envEl = env.current!

    void animate(hint.current!, { opacity: 0 }, { duration: 0.3 * k })
    // 1. 눌림
    await animate(sealEl, { scale: 0.88 }, { duration: 0.16 * k, ease: 'easeOut' })
    await animate(sealEl, { scale: 1.04 }, { duration: 0.22 * k, ease: SOFT })
    // 2. 봉인 해제 — 살짝 들렸다가 떨어짐
    await animate(sealEl, { y: -6, rotate: -6 }, { duration: 0.18 * k, ease: 'easeOut' })
    void animate(sealEl, { y: 120, rotate: 28, opacity: 0, scale: 0.9 }, { duration: 0.7 * k, ease: [0.55, 0, 0.75, 0.4] })
    await new Promise((r) => setTimeout(r, 220 * k))
    // 3. 덮개 열림 (절반 지나면 카드 뒤로)
    const flapAnim = animate(flapEl, { rotateX: 180 }, { duration: 1.0 * k, ease: EASE })
    setTimeout(() => {
      flapEl.style.zIndex = '1'
    }, 500 * k)
    await flapAnim
    // 4. 카드가 위로 올라옴
    const envH = envEl.getBoundingClientRect().height
    await animate(cardEl, { y: -envH * 0.62 }, { duration: 1.05 * k, ease: SOFT })
    // 5. 카드가 앞으로 나와 화면 가득 확대
    cardEl.style.zIndex = '6'
    const rect = cardEl.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const scale = Math.max(vw / rect.width, vh / rect.height) * 1.04
    const dy = vh / 2 - (rect.top + rect.height / 2)
    void animate(pocket.current!, { opacity: 0, y: 40 }, { duration: 0.7 * k, ease: 'easeIn' })
    void animate(flapEl, { opacity: 0 }, { duration: 0.5 * k })
    void animate(envEl.querySelector('.env-back')!, { opacity: 0 }, { duration: 0.6 * k })
    await animate(cardEl, { y: -envH * 0.62 + dy, scale }, { duration: 1.1 * k, ease: EASE })
    // 6. 다음 섹션으로
    await animate(root.current!, { opacity: 0 }, { duration: 0.7 * k, ease: 'easeOut' })
    setPhase('done')
    onOpened()
  }

  const tex = `paper-${s.texture}`
  return (
    <motion.div
      ref={root}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--c-bg)', touchAction: 'none' }}
      initial={motionOn ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      role="dialog"
      aria-label="청첩장 봉투"
    >
      {/* 은은한 자연광 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 20% 0%, rgba(255,255,255,.9), rgba(255,255,255,0) 60%), radial-gradient(90% 60% at 100% 100%, color-mix(in srgb, var(--c-sage) 18%, transparent), transparent 70%)',
        }}
      />
      <p className="eyebrow relative mb-10" style={{ letterSpacing: '0.4em' }}>
        {content.couple.brideEn && content.couple.groomEn ? 'Wedding Invitation' : 'Invitation'}
      </p>

      <div
        ref={env}
        className="relative"
        style={{ width: 'min(84vw, 360px)', aspectRatio: '1.46', perspective: 1400 }}
      >
        {/* 뒷면 + 안쪽 라이닝 */}
        <div
          className={`env-back absolute inset-0 ${tex}`}
          style={{
            backgroundColor: s.envelopeColor,
            borderRadius: 6,
            boxShadow: '0 30px 60px -30px rgba(81,74,67,.35), 0 2px 6px rgba(81,74,67,.06)',
            zIndex: 0,
          }}
        >
          <div
            className="absolute inset-x-[6%] top-[4%] h-[56%]"
            style={{ background: s.liningColor, clipPath: 'polygon(0 0,100% 0,50% 100%)', opacity: 0.9 }}
          />
        </div>

        {/* 카드 */}
        <div
          ref={card}
          className={`absolute left-[5%] right-[5%] top-[6%] bottom-[6%] flex flex-col items-center justify-center ${'paper-cotton'}`}
          style={{
            zIndex: 2,
            background: 'var(--c-bg)',
            backgroundColor: 'color-mix(in srgb, var(--c-bg) 70%, white)',
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(81,74,67,.1)',
            transformOrigin: '50% 50%',
            willChange: 'transform',
          }}
        >
          <p className="font-script text-[2rem] leading-none" style={{ color: 'var(--c-text)' }}>
            {s.cardText}
          </p>
          <div className="my-3 h-px w-10" style={{ background: 'var(--c-accent)', opacity: 0.6 }} />
          <p className="font-serif-en text-[0.7rem] tracking-[0.3em]" style={{ color: 'var(--c-muted)' }}>
            {formatEnDate(date)}
          </p>
        </div>

        {/* 앞주머니 */}
        <div ref={pocket} className="absolute inset-0" style={{ zIndex: 3 }}>
          <div
            className={`absolute inset-0 ${tex}`}
            style={{
              backgroundColor: s.envelopeColor,
              clipPath: 'polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)',
              borderRadius: 6,
              filter: 'drop-shadow(0 -1px 0 rgba(0,0,0,.03))',
            }}
          />
          {/* 접힌 선 */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d="M0 100 L50 55 L100 100" fill="none" stroke="rgba(81,74,67,.10)" strokeWidth=".35" vectorEffect="non-scaling-stroke" />
            <path d="M0 0 L50 55 L100 0" fill="none" stroke="rgba(81,74,67,.06)" strokeWidth=".35" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        {/* 윗 덮개 */}
        <div
          ref={flap}
          className="absolute inset-x-0 top-0 h-[60%]"
          style={{ zIndex: 4, transformOrigin: '50% 0%', transformStyle: 'preserve-3d' }}
        >
          <div
            className={`absolute inset-0 ${tex}`}
            style={{
              backgroundColor: s.envelopeColor,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              backfaceVisibility: 'hidden',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.05))',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${s.liningColor}, color-mix(in srgb, ${s.liningColor} 85%, #000))`,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              transform: 'rotateX(180deg)',
              backfaceVisibility: 'hidden',
            }}
          />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden style={{ backfaceVisibility: 'hidden' }}>
            <path d="M0 0 L50 100 L100 0" fill="none" stroke="rgba(81,74,67,.12)" strokeWidth=".4" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        {/* 실링왁스 */}
        <div className="absolute left-1/2 top-[60%]" style={{ zIndex: 5, transform: 'translate(-50%, -50%)' }}>
          <button
            ref={seal}
            type="button"
            onClick={open}
            aria-label="실링왁스를 눌러 청첩장 열기"
            className="block rounded-full p-2 outline-none focus-visible:ring-2"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <motion.span
              className="block"
              animate={phase === 'idle' && motionOn ? { scale: [1, 1.035, 1] } : { scale: 1 }}
              transition={phase === 'idle' ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.15 }}
            >
              <WaxSeal settings={s} size={78} />
            </motion.span>
          </button>
        </div>
      </div>

      <p
        ref={hint}
        className="font-serif-en relative mt-12 text-[0.82rem] italic tracking-[0.12em]"
        style={{ color: 'var(--c-muted)', marginBottom: 'var(--safe-bottom)' }}
      >
        {s.hint}
      </p>
    </motion.div>
  )
}
