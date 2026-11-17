import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, type MotionValue } from 'framer-motion'
import type { SectionOf } from '../lib/types'
import { WaxSeal } from './WaxSeal'
import { Ribbon, type RibbonHandle } from './Ribbon'
import { useInvite } from './context'

interface Props {
  section: SectionOf<'envelope'>
  onOpened: () => void
  /** 메인 화면이 올라오기 시작할 때 (메인 진입 애니메이션 시작) */
  onReveal: () => void
  /** 뒤에 있는 메인 화면의 세로 위치 (봉투 안에서 올라오는 효과) */
  pageY: MotionValue<number>
}

const EASE = [0.65, 0, 0.35, 1] as const
const SOFT = [0.22, 0.61, 0.36, 1] as const
const FLAP = 0.58 // 덮개 높이 (봉투 높이 대비) — 실링왁스가 붙는 위치

/**
 * 실링왁스 봉투 오프닝 (봉투 크기는 그대로)
 * 1) 왁스가 눌림 → 2) 봉인 해제(떨어짐) → 3) 덮개가 위로 접히며 열림
 * 4) 봉투 안에서 메인 화면이 위로 올라오고, 봉투는 아래로 내려가며 사라짐 → 메인 화면
 */
export function Envelope({ section, onOpened, onReveal, pageY }: Props) {
  const { content, motionOn } = useInvite()
  const s = section.settings
  const closeup = s.startView !== 'full'
  const useRibbon = s.closure !== 'seal'
  const ribbon = useRef<RibbonHandle>(null)
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
  const sealSize = Math.round(vp.ew * sx * (closeup ? 0.3 : 0.25))

  async function open() {
    if (phase !== 'idle') return
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
    if (useRibbon) {
      // 1~2. 리본 매듭이 풀리고, 리본 끝이 화면 가득 흔들리며 떨어짐 (계속 진행)
      await ribbon.current!.untie(k)
      await new Promise((r) => setTimeout(r, 250 * k))
    } else {
      const sealEl = seal.current!
      // 1. 눌림
      await animate(sealEl, { scale: 0.92 }, { duration: 0.18 * k, ease: 'easeOut' })
      await animate(sealEl, { scale: 1.02 }, { duration: 0.24 * k, ease: SOFT })
      // 2. 봉인 해제 — 살짝 들렸다가 부드럽게 떨어짐
      await animate(sealEl, { y: -6, rotate: -5 }, { duration: 0.2 * k, ease: 'easeOut' })
      void animate(sealEl, { y: vh * 0.35, rotate: 24, opacity: 0, scale: 0.9 }, { duration: 0.8 * k, ease: [0.55, 0, 0.75, 0.4] })
      await new Promise((r) => setTimeout(r, 320 * k))
    }
    // 3. 덮개가 위로 접히며 열림 (절반 지나면 뒤로)
    void animate(eyebrow.current!, { opacity: 0 }, { duration: 0.4 * k })
    const flapAnim = animate(flapEl, { rotateX: 180 }, { duration: 1.0 * k, ease: EASE })
    setTimeout(() => {
      flapEl.style.zIndex = '1'
    }, 500 * k)
    await flapAnim
    // 4. 봉투 안쪽이 걷히며 메인 화면이 보이고 → 메인은 위로, 봉투는 아래로
    onReveal()
    const d = 1.35 * k
    void animate(bg.current!, { opacity: 0 }, { duration: 0.6 * k, ease: 'easeOut' })
    root.current!.querySelectorAll('.env-back').forEach((el) => void animate(el, { opacity: 0 }, { duration: 0.6 * k, ease: 'easeOut' }))
    void animate(flapEl, { opacity: 0 }, { duration: 0.5 * k })
    void animate(pageY, 0, { duration: d, ease: EASE })
    await animate(pocket.current!, { y: (vh * 1.05) / Math.max(0.2, camY.get()) }, { duration: d, ease: EASE })
    setPhase('done')
    onOpened()
  }

  const tex = `paper-${s.texture}`
  const tri = `polygon(0 0, 100% 0, 50% 100%)`
  return (
    <motion.div
      ref={root}
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{ touchAction: 'none' }}
      initial={motionOn ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      role="dialog"
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
            <div ref={env} className="relative" style={{ width: 'min(84vw, 360px)', aspectRatio: '1.46', perspective: 1400 }}>
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

              {/* 앞주머니 */}
              <div ref={pocket} className="absolute inset-0" style={{ zIndex: 3 }}>
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
                style={{ height: `${FLAP * 100}%`, zIndex: 4, transformOrigin: '50% 0%', transformStyle: 'preserve-3d' }}
              >
                <div
                  className={`absolute inset-0 ${tex}`}
                  style={{
                    backgroundColor: s.envelopeColor,
                    clipPath: tri,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.05))',
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
            </div>
          </motion.div>
        </div>
      </div>

      {useRibbon ? (
        <Ribbon
          ref={ribbon}
          color={s.ribbonColor}
          vw={vp.w}
          vh={vp.h}
          cx={vp.w / 2}
          cy={vp.h / 2 + sealOffset}
          top={vp.h / 2 - (vp.eh * sy) / 2}
          bottom={vp.h / 2 + (vp.eh * sy) / 2}
          width={Math.round(vp.ew * sx * 0.065)}
          onBowClick={open}
          label="리본을 풀어 청첩장 열기"
        />
      ) : (
        <>
      {/* 실링왁스 — 카메라 밖에 두어 클로즈업에서도 찌그러지지 않음 */}
        <div
        ref={sealWrap}
        className="absolute left-1/2 top-1/2"
        style={{ zIndex: 5, transform: `translate(-50%, calc(-50% + ${sealOffset}px))` }}
      >
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
            <WaxSeal settings={s} size={sealSize} />
          </motion.span>
        </button>
      </div>

        </>
      )}

      <p
        ref={hint}
        className="font-serif-en absolute inset-x-0 text-center text-[0.86rem] italic tracking-[0.12em]"
        style={{ color: 'var(--c-muted)', bottom: 'calc(11% + var(--safe-bottom))', zIndex: 5 }}
      >
        {useRibbon && /seal/i.test(s.hint) ? 'untie the ribbon to open' : s.hint}
      </p>
    </motion.div>
  )
}
