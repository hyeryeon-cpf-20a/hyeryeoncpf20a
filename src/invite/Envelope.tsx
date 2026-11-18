import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, type MotionValue } from 'framer-motion'
import type { SectionOf } from '../lib/types'
import { WaxSeal } from './WaxSeal'
import { MainSection } from './sections/MainSection'
import { useInvite } from './context'

interface Props {
  section: SectionOf<'envelope'>
  onOpened: () => void
  /** 메인 화면이 올라오기 시작할 때 (메인 진입 애니메이션 시작) */
  onReveal: () => void
  /** 뒤에 있는 메인 화면의 세로 위치 (봉투 안에서 올라오는 효과) */
  pageY: MotionValue<number>
  /** 봉투 안 카드로 보여줄 메인 화면 (첫 화면) */
  cardSection?: SectionOf<'main'>
}

const EASE = [0.65, 0, 0.35, 1] as const
const SOFT = [0.22, 0.61, 0.36, 1] as const
const FLAP = 0.58 // 덮개 높이 (봉투 높이 대비) — 실링왁스가 붙는 위치
const CARD_SCALE = 0.6 // 봉투 안 카드 크기 (화면 대비)

/**
 * 실링왁스 봉투 오프닝 (봉투 크기는 그대로)
 * 1) 왁스가 눌림 → 2) 봉인 해제(떨어짐) → 3) 덮개가 위로 접히며 열림
 * 4) 봉투 안에서 메인 화면(카드)이 올라오고, 다 나오도록 봉투는 살짝 아래로
 * 5) 카드가 화면을 꽉 채우도록 커지며 그대로 메인 화면이 됨
 */
export function Envelope({ section, onOpened, onReveal, pageY, cardSection }: Props) {
  const { content, motionOn } = useInvite()
  const s = section.settings
  const closeup = s.startView !== 'full'
  const [phase, setPhase] = useState<'idle' | 'opening' | 'done'>('idle')
  const root = useRef<HTMLDivElement>(null)
  const camera = useRef<HTMLDivElement>(null)
  const env = useRef<HTMLDivElement>(null)
  const sealWrap = useRef<HTMLDivElement>(null)
  const seal = useRef<HTMLButtonElement>(null)
  const flap = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLDivElement>(null)
  const bg = useRef<HTMLDivElement>(null)
  const pocket = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const envMove = useMotionValue(0) // 봉투가 아래로 물러나는 거리(봉투 좌표)
  const cardY = useMotionValue(0)
  const cardS = useMotionValue(CARD_SCALE)
  const cardR = useMotionValue(14)
  const clip = useMotionValue('none')
  const clipOff = useRef(false)
  const hint = useRef<HTMLParagraphElement>(null)
  const eyebrow = useRef<HTMLParagraphElement>(null)
  const k = 1 / Math.max(0.3, (s.speed || 1) * (content.animation.speed || 1))
  const [vp, setVp] = useState({ w: 390, h: 844, ew: 328, eh: 225 })

  useEffect(() => {
    // 봉투가 떠 있는 동안 뒤 페이지 스크롤 잠금
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prev
    }
  }, [])

  // 화면 크기 측정 (클로즈업 배율 계산)
  useLayoutEffect(() => {
    const measure = () => {
      if (phase !== 'idle') return
      const r = root.current?.getBoundingClientRect()
      const e = env.current
      if (!r || !e) return
      setVp({ w: r.width, h: r.height, ew: e.offsetWidth, eh: e.offsetHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [phase])

  // 클로즈업: 봉투를 화면 크기에 꼭 맞게 확대 (가로·세로 각각)
  // 클로즈업: 봉투 비율은 그대로, 화면 가로를 가득 채우도록 확대
  const sx = closeup ? vp.w / vp.ew : 1
  const sy = sx
  const camX = useMotionValue(sx)
  const camY = useMotionValue(sy)
  useLayoutEffect(() => {
    if (phase !== 'idle') return
    camX.set(sx)
    camY.set(sy)
  }, [sx, sy, phase, camX, camY])
  // 실링왁스 위치: 덮개 끝 (화면 중심 기준 세로 오프셋)
  const sealOffset = (FLAP - 0.5) * vp.eh * sy
  // 카드(= 메인 화면을 작게 줄인 것). 봉투 좌표계에서의 크기
  const cardW = vp.w / sx
  const cardH = vp.h / sx
  // 봉투 아래로 삐져나온 카드 부분은 잘라서 봉투 안에 있는 것처럼
  useEffect(() => {
    const update = () => {
      if (clipOff.current) return
      const below = Math.max(0, (cardY.get() + cardH * cardS.get() - vp.eh) / cardS.get())
      clip.set(`inset(0 0 ${below.toFixed(1)}px 0 round ${cardR.get().toFixed(1)}px)`)
    }
    update()
    const a = cardY.on('change', update)
    const b = cardS.on('change', update)
    return () => {
      a()
      b()
    }
  }, [cardY, cardS, cardR, clip, cardH, vp.eh])
  useLayoutEffect(() => {
    if (phase === 'idle') cardY.set(vp.eh * 0.12)
  }, [vp.eh, phase, cardY])
  const sealSize = Math.round(vp.ew * sx * (closeup ? 0.3 : 0.25))

  const opening = useRef(false)
  const ripple = useRef<HTMLSpanElement>(null)
  async function open() {
    if (opening.current) return
    opening.current = true
    setPhase('opening')
    if (!motionOn) {
      await animate(root.current!, { opacity: 0 }, { duration: 0.45 })
      setPhase('done')
      onOpened()
      return
    }
    const flapEl = flap.current!
    const vh = window.innerHeight

    void animate(hint.current!, { opacity: 0 }, { duration: 0.3 * k })
      const sealEl = seal.current!
      // 1. 눌림
      // 어디를 눌러도 실링왁스가 반응: 퍼지는 물결 + 꾹 눌림
      if (ripple.current) void animate(ripple.current, { scale: [0.9, 2.1], opacity: [0.45, 0] }, { duration: 0.9 * k, ease: 'easeOut' })
      await animate(sealEl, { scale: 0.86 }, { duration: 0.2 * k, ease: 'easeOut' })
      await animate(sealEl, { scale: 1.04 }, { duration: 0.26 * k, ease: SOFT })
      // 2. 봉인 해제 — 살짝 들렸다가 부드럽게 떨어짐
      await animate(sealEl, { y: -6, rotate: -5 }, { duration: 0.2 * k, ease: 'easeOut' })
      void animate(sealEl, { y: vh * 0.35, rotate: 24, opacity: 0, scale: 0.9 }, { duration: 0.8 * k, ease: [0.55, 0, 0.75, 0.4] })
      await new Promise((r) => setTimeout(r, 320 * k))
    // 3. 덮개가 위로 접히며 열림 (절반 지나면 뒤로)
    void animate(eyebrow.current!, { opacity: 0 }, { duration: 0.4 * k })
    const flapAnim = animate(flapEl, { rotateX: 180 }, { duration: 1.0 * k, ease: EASE })
    setTimeout(() => {
      flapEl.style.zIndex = '1'
    }, 500 * k)
    await flapAnim
    // 4. 봉투 안에서 메인 화면(카드)이 올라오고, 다 나오도록 봉투는 살짝 아래로
    pageY.set(0)
    const cam = Math.max(0.2, camY.get())
    const envTop0 = vh / 2 - (vp.eh * cam) / 2
    const cardTopEnd = vh * 0.07
    const cardBottomEnd = cardTopEnd + CARD_SCALE * vh
    const envDown = (cardBottomEnd + 10 - envTop0) / cam
    void animate(eyebrow.current!, { opacity: 0 }, { duration: 0.3 * k })
    await Promise.all([
      // 카드와 봉투를 같은 속도·곡선으로 움직여 카드가 화면 위로 튀지 않게
      animate(cardY, (cardTopEnd - envTop0) / cam - envDown, { duration: 1.35 * k, ease: EASE }),
      animate(envMove, envDown, { duration: 1.35 * k, ease: EASE }),
    ])
    // 5. 카드가 화면에 꽉 차게 커지며 그대로 메인 화면이 됨
    clipOff.current = true
    clip.set('none')
    if (card.current) card.current.style.zIndex = '6'
    onReveal()
    const fade = { duration: 0.6 * k, ease: 'easeOut' as const }
    // 바탕은 카드가 화면을 다 덮을 때까지 그대로 두어 뒤의 메인 화면이 겹쳐 보이지 않게
    root.current!.querySelectorAll('.env-back').forEach((el) => void animate(el, { opacity: 0 }, fade))
    void animate(flapEl, { opacity: 0 }, fade)
    void animate(pocket.current!, { opacity: 0 }, fade)
    await Promise.all([
      animate(cardY, (0 - envTop0) / cam - envDown, { duration: 1.05 * k, ease: EASE }),
      animate(cardS, 1, { duration: 1.05 * k, ease: EASE }),
      animate(cardR, 0, { duration: 1.05 * k, ease: EASE }),
    ])
    setPhase('done')
    onOpened()
  }

  // 진한 봉투(네이비 등)는 밝은 빛 반사를 줄인 질감 사용
  const envRgb = [1, 3, 5].map((i) => parseInt((s.envelopeColor || '#F7F3EC').slice(i, i + 2), 16) || 0)
  const darkEnv = (0.299 * envRgb[0] + 0.587 * envRgb[1] + 0.114 * envRgb[2]) / 255 < 0.45
  const tex = darkEnv ? 'paper-dark' : `paper-${s.texture}`
  const tri = `polygon(0 0, 100% 0, 50% 100%)`
  return (
    <motion.div
      ref={root}
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{ touchAction: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none' }}
      initial={motionOn ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      role="dialog"
      onClick={() => void open()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && void open()}
      tabIndex={-1}
      aria-label="청첩장 봉투"
    >
      <div ref={bg} aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'var(--c-bg)' }}>
      {/* 은은한 자연광 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 20% 0%, rgba(255,255,255,.9), rgba(255,255,255,0) 60%), radial-gradient(90% 60% at 100% 100%, color-mix(in srgb, var(--c-sage) 18%, transparent), transparent 70%)',
        }}
      />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <p
            ref={eyebrow}
            className="eyebrow absolute inset-x-0 text-center"
            style={{ bottom: `calc(100% + ${closeup ? 64 : 40}px)`, letterSpacing: '0.4em', whiteSpace: 'nowrap' }}
          >
            Wedding Invitation
          </p>

          {/* 카메라: 클로즈업에서는 봉투가 화면을 가득 채움 */}
          <motion.div ref={camera} style={{ scaleX: camX, scaleY: camY, transformOrigin: '50% 50%' }}>
            <motion.div ref={env} className="relative" style={{ width: 'min(84vw, 360px)', aspectRatio: '1.46', perspective: 1400, y: envMove }}>
              {/* 바닥에 닿는 부드러운 그림자 */}
              <div
                aria-hidden
                className="env-back pointer-events-none absolute"
                style={{
                  left: '4%',
                  right: '4%',
                  bottom: '-9%',
                  height: '22%',
                  background: 'radial-gradient(50% 50% at 50% 50%, rgba(81,74,67,.20), rgba(81,74,67,0) 100%)',
                  filter: 'blur(8px)',
                  zIndex: 0,
                }}
              />
              {/* 뒷면 + 안쪽 라이닝 */}
              <div
                ref={back}
                className={`env-back absolute inset-0 ${tex}`}
                style={{
                  backgroundColor: s.envelopeColor,
                  borderRadius: 6,
                  boxShadow: '0 1px 2px rgba(81,74,67,.06), 0 6px 14px -8px rgba(81,74,67,.14)',
                  zIndex: 0,
                }}
              >
                <div className="absolute inset-x-[6%] top-[4%]" style={{ height: `${FLAP * 100 - 4}%`, background: s.liningColor, clipPath: tri, opacity: 0.9 }} />
              </div>

              {/* 봉투 안의 카드 = 메인 화면을 작게 줄인 것 */}
              <motion.div
                ref={card}
                aria-hidden
                className="absolute left-1/2 top-0 overflow-hidden"
                style={{
                  width: cardW,
                  height: cardH,
                  marginLeft: -cardW / 2,
                  zIndex: 2,
                  y: cardY,
                  scale: cardS,
                  borderRadius: cardR,
                  clipPath: clip,
                  transformOrigin: '50% 0%',
                  background: 'var(--c-bg)',
                  boxShadow: '0 10px 30px -12px rgba(81,74,67,.35)',
                  willChange: 'transform',
                }}
              >
                <div style={{ width: vp.w, height: vp.h, transform: `scale(${1 / sx})`, transformOrigin: '0 0', pointerEvents: 'none' }}>
                  {cardSection ? (
                    <MainSection section={cardSection} />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                      <p className="font-script text-[2.6rem]">{s.cardText || 'You are invited'}</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* 앞주머니 */}
              <div ref={pocket} className="absolute inset-0" style={{ zIndex: 3, willChange: 'transform' }}>
                <div
                  className={`absolute inset-0 ${tex}`}
                  style={{
                    backgroundColor: s.envelopeColor,
                    clipPath: `polygon(0 0, 50% ${FLAP * 100 - 3}%, 100% 0, 100% 100%, 0 100%)`,
                    borderRadius: 6,
                  }}
                />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  <path d={`M0 100 L50 ${FLAP * 100 - 3} L100 100`} fill="none" stroke="rgba(81,74,67,.10)" strokeWidth=".35" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>

              {/* 윗 덮개 — 앞면(봉투색) / 뒷면(라이닝)이 위로 접히며 열림 */}
              <div
                ref={flap}
                className="absolute inset-x-0 top-0"
                style={{ height: `${FLAP * 100}%`, zIndex: 4, transformOrigin: '50% 0%', transformStyle: 'preserve-3d', willChange: 'transform' }}
              >
                <div
                  className={`absolute inset-0 ${tex}`}
                  style={{
                    backgroundColor: s.envelopeColor,
                    clipPath: tri,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                />
                {/* 뒷면: 덮개가 뒤집혔을 때 꼭짓점이 위를 향하도록 같은 삼각형을 그대로 뒤집어 둠 */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(0deg, ${s.liningColor}, color-mix(in srgb, ${s.liningColor} 88%, #000))`,
                    clipPath: 'polygon(0 100%, 100% 100%, 50% 0)',
                    transform: 'rotateX(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                />
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <path d="M0 0 L50 100 L100 0" fill="none" stroke="rgba(81,74,67,.12)" strokeWidth=".4" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* 실링왁스 — 카메라 밖에 두어 클로즈업에서도 찌그러지지 않음 */}
        <div
        ref={sealWrap}
        className="absolute left-1/2 top-1/2"
        style={{ zIndex: 5, transform: `translate(-50%, calc(-50% + ${sealOffset}px))` }}
      >
        <span
          ref={ripple}
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto rounded-full"
          style={{ width: sealSize, height: sealSize, border: `2px solid ${s.waxColor}`, opacity: 0 }}
        />
        <button
          ref={seal}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            void open()
          }}
          aria-label="화면을 눌러 청첩장 열기"
          className="block rounded-full p-2 outline-none focus-visible:ring-2"
          style={{ WebkitTapHighlightColor: 'transparent', willChange: 'transform' }}
        >
          <motion.span
            className="block"
            animate={phase === 'idle' && motionOn ? { scale: [1, 1.035, 1] } : { scale: 1 }}
            transition={phase === 'idle' ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.15 }}
          >
            <WaxSeal settings={s} size={sealSize} />
          </motion.span>
        </button>
      </div>


      <p
        ref={hint}
        className="pointer-events-none absolute inset-x-0 flex items-center justify-center gap-3"
        style={{ bottom: 'calc(10% + var(--safe-bottom))', zIndex: 5, color: 'var(--c-muted)' }}
      >
        <span className="h-px w-8" style={{ background: 'currentColor', opacity: 0.45 }} />
        <motion.span
          className="font-serif-en text-[0.8rem] uppercase tracking-[0.42em]"
          animate={motionOn && phase === 'idle' ? { opacity: [0.45, 1, 0.45] } : { opacity: 1 }}
          transition={motionOn && phase === 'idle' ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        >
          {!s.hint || /seal/i.test(s.hint) ? 'Tap anywhere to open' : s.hint}
        </motion.span>
        <span className="h-px w-8" style={{ background: 'currentColor', opacity: 0.45 }} />
      </p>
    </motion.div>
  )
}
