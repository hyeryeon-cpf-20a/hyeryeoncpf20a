import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, type MotionValue } from 'framer-motion'
import type { SectionOf } from '../lib/types'
import { parseWedding } from '../lib/date'
import { useInvite } from './context'
import { WaxSeal } from './WaxSeal'

/**
 * 진주 봉투 (화면을 꽉 채우는 종이 봉투 + 둥근 곡선 덮개 + 진주 한 알).
 * 화면 아무 곳이나 누르면: 진주가 눌렸다 사라짐 → 위 덮개가 위로 젖혀짐 → 아래 덮개가 내려가며 메인 화면이 나타남.
 */

const EASE = [0.65, 0, 0.35, 1] as const
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** 진주 한 알 — 흰 진주에 은은한 무지갯빛 광택 */
export function Pearl({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id="pearl-body" cx="38%" cy="32%" r="72%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".35" stopColor="#f6f4f1" />
          <stop offset=".72" stopColor="#dcd8d3" />
          <stop offset="1" stopColor="#b9b4ae" />
        </radialGradient>
        <radialGradient id="pearl-irid" cx="65%" cy="70%" r="55%">
          <stop offset="0" stopColor="#f7e3ea" stopOpacity=".55" />
          <stop offset=".5" stopColor="#e3ecf6" stopOpacity=".35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pearl-spec" cx="34%" cy="28%" r="18%">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="pearl-shadow" x="-40%" y="-40%" width="180%" height="190%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#2a2622" floodOpacity=".28" />
        </filter>
      </defs>
      <g filter="url(#pearl-shadow)">
        <circle cx="50" cy="50" r="44" fill="url(#pearl-body)" />
      </g>
      <circle cx="50" cy="50" r="44" fill="url(#pearl-irid)" />
      <circle cx="50" cy="50" r="44" fill="url(#pearl-spec)" />
      <ellipse cx="62" cy="76" rx="16" ry="6" fill="#fff" opacity=".35" />
      <circle cx="50" cy="50" r="43.5" fill="none" stroke="#a9a39c" strokeOpacity=".35" strokeWidth=".8" />
    </svg>
  )
}

/** 원호 경로: 가로 폭 W 의 양 끝(y)에서 가운데가 sag 만큼 처지는(+) / 솟는(−) 호 */
function arcRadius(W: number, sag: number) {
  const s = Math.abs(sag)
  return (W * W) / 4 / (2 * s) + s / 2
}

export function PearlEnvelope({
  section,
  onOpened,
  onReveal,
  pageY,
}: {
  section: SectionOf<'envelope'>
  onOpened: () => void
  onReveal: () => void
  pageY: MotionValue<number>
}) {
  const { content, motionOn } = useInvite()
  const s = section.settings
  const k = 1 / Math.max(0.3, (s.speed || 1) * (content.animation.speed || 1))
  const root = useRef<HTMLDivElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLDivElement>(null)
  const pearl = useRef<HTMLButtonElement>(null)
  const hint = useRef<HTMLParagraphElement>(null)
  const opening = useRef(false)
  const [vp, setVp] = useState({ w: 390, h: 844 })

  useEffect(() => {
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prev
    }
  }, [])
  useLayoutEffect(() => {
    const m = () => {
      const r = root.current?.getBoundingClientRect()
      if (r) setVp({ w: r.width, h: r.height })
    }
    m()
    window.addEventListener('resize', m)
    return () => window.removeEventListener('resize', m)
  }, [])

  const { w: W, h: H } = vp
  // 위 덮개: 양옆 a 높이에서 가운데 tip 까지 아래로 둥글게
  const a = H * 0.44
  const tip = H * 0.57
  const r1 = arcRadius(W, tip - a)
  const topPath = `M0,0 L${W},0 L${W},${a} A${r1},${r1} 0 0 1 0,${a} Z`
  // 아래 덮개: 양옆 b 높이에서 가운데가 위로 솟음 (위 덮개 밑에 숨음)
  const b = H * 0.63
  const peak = H * 0.5
  const r2 = arcRadius(W, b - peak)
  const bottomPath = `M0,${H} L0,${b} A${r2},${r2} 0 0 1 ${W},${b} L${W},${H} Z`

  const d = parseWedding(content.wedding)
  const h12 = d.hh % 12 === 0 ? 12 : d.hh % 12
  const dateLine = `${d.y}. ${String(d.m).padStart(2, '0')}. ${String(d.d).padStart(2, '0')}. ${DAYS[d.weekday]}  ${h12}:${String(d.mm).padStart(2, '0')}${d.hh < 12 ? 'AM' : 'PM'}`
  const names = [content.couple.groomEn, content.couple.brideEn].filter(Boolean)
  const nameChars = names.join('').length + 3
  const nameSize = Math.max(18, Math.min(30, (Math.min(W, 430) * 0.8) / (nameChars * 0.72)))
  const paper = { backgroundColor: s.envelopeColor || '#F7F6F3', backgroundImage: "url('/textures/felt.png'), url('/textures/cotton.png')" }

  async function open() {
    if (opening.current) return
    opening.current = true
    if (!motionOn) {
      await animate(root.current!, { opacity: 0 }, { duration: 0.45 })
      onOpened()
      return
    }
    void animate(hint.current!, { opacity: 0 }, { duration: 0.3 * k })
    const p = pearl.current!
    await animate(p, { scale: 0.86 }, { duration: 0.18 * k, ease: 'easeOut' })
    await animate(p, { scale: 1.06 }, { duration: 0.22 * k, ease: 'easeOut' })
    void animate(p, { scale: 0.4, opacity: 0, y: 14 }, { duration: 0.45 * k, ease: 'easeIn' })
    await new Promise((r) => setTimeout(r, 200 * k))
    // 위 덮개가 위로 젖혀지고, 아래 덮개는 내려가며 메인이 드러남
    onReveal()
    pageY.set(H * 0.06)
    const dur = 1.25 * k
    await Promise.all([
      animate(top.current!, { rotateX: 165, opacity: [1, 1, 0] }, { duration: dur, ease: EASE }),
      animate(bottom.current!, { y: H * 0.55, opacity: [1, 1, 0] }, { duration: dur, ease: EASE }),
      animate(back.current!, { opacity: 0 }, { duration: dur * 0.8, delay: dur * 0.15, ease: 'easeOut' }),
      animate(pageY, 0, { duration: dur, ease: EASE }),
    ])
    onOpened()
  }

  const serif = { fontFamily: 'var(--f-serif)' }
  return (
    <motion.div
      ref={root}
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{ touchAction: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none', perspective: 1600 }}
      initial={false}
      role="dialog"
      aria-label="청첩장 봉투"
      onClick={() => void open()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && void open()}
      tabIndex={-1}
    >
      {/* 봉투 안쪽(뒷면) */}
      <div ref={back} className="absolute inset-0" style={{ ...paper, filter: 'brightness(1.03)' }} />

      {/* 아래 덮개 + 날짜 */}
      <div ref={bottom} className="absolute inset-0" style={{ filter: 'drop-shadow(0 -2px 6px rgba(40,34,30,.10))', willChange: 'transform' }}>
        <div className="absolute inset-0" style={{ ...paper, clipPath: `path('${bottomPath}')` }} />
        <div className="absolute inset-x-0 text-center" style={{ top: H * 0.75 }}>
          <p className="text-[1rem] tracking-[0.04em]" style={{ ...serif, color: 'var(--c-text)' }}>
            {dateLine}
          </p>
          <div className="mx-auto mt-5 h-px" style={{ width: W * 0.62, background: 'var(--c-text)', opacity: 0.55 }} />
        </div>
      </div>

      {/* 위 덮개 + 문구 */}
      <div
        ref={top}
        className="absolute inset-0"
        style={{ transformOrigin: '50% 0%', filter: 'drop-shadow(0 4px 8px rgba(40,34,30,.14))', willChange: 'transform' }}
      >
        <div className="absolute inset-0" style={{ ...paper, clipPath: `path('${topPath}')` }} />
        <div className="absolute inset-x-0 px-8 text-center" style={{ top: H * 0.11 }}>
          <p className="whitespace-pre-line text-[0.82rem] uppercase leading-[1.7] tracking-[0.12em]" style={{ ...serif, color: 'var(--c-muted)' }}>
            {s.pearlTopText}
          </p>
        </div>
        <div className="absolute inset-x-0 text-center" style={{ top: H * 0.28 }}>
          <p className="flex items-baseline justify-center gap-2" style={{ color: 'var(--c-text)' }}>
            <span className="text-[1.05rem] tracking-[0.18em]" style={serif}>
              THE
            </span>
            <span className="font-script text-[2rem] leading-none">Wedding</span>
            <span className="text-[1.05rem] tracking-[0.18em]" style={serif}>
              OF
            </span>
          </p>
          <p className="mt-3 flex items-center justify-center gap-3 uppercase tracking-[0.06em]" style={{ ...serif, color: 'var(--c-text)', fontSize: nameSize }}>
            <span>{names[0] ?? ''}</span>
            <span style={{ fontStyle: 'italic', fontSize: nameSize * 0.72 }}>
              &amp;
            </span>
            <span>{names[1] ?? ''}</span>
          </p>
        </div>
      </div>

      {/* 진주 */}
      <div className="absolute left-1/2" style={{ top: tip, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
        <motion.button
          ref={pearl}
          type="button"
          aria-label="화면을 눌러 청첩장 열기"
          onClick={(e) => {
            e.stopPropagation()
            void open()
          }}
          className="block rounded-full outline-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          animate={motionOn && !opening.current ? { scale: [1, 1.04, 1] } : undefined}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {s.pearlClosure === 'seal' ? (
            <WaxSeal settings={{ ...s, waxColor: s.waxColor }} size={Math.round(Math.min(W, 430) * 0.24)} />
          ) : (
            <Pearl size={Math.round(Math.min(W, 430) * 0.12)} />
          )}
        </motion.button>
      </div>

      <p
        ref={hint}
        className="pointer-events-none absolute inset-x-0 text-center text-[0.68rem] uppercase tracking-[0.42em]"
        style={{ ...serif, color: 'var(--c-muted)', bottom: 'calc(5% + var(--safe-bottom))', zIndex: 5 }}
      >
        {!s.hint || /seal/i.test(s.hint) ? 'Tap anywhere to open' : s.hint}
      </p>
    </motion.div>
  )
}
