import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { animate, type MotionValue } from 'framer-motion'
import type { SectionOf } from '../lib/types'
import { parseWedding } from '../lib/date'
import { useInvite } from './context'
import { Pearl } from './PearlEnvelope'

/**
 * 리본코어 봉투 — 가운데 세로선으로 갈라지는 양문형 흰 새틴 봉투.
 * 가운데 선을 따라 납작한 새틴 리본이 신발끈처럼 X자로 엮여 있고,
 * 누르면 리본이 위에서부터 풀린 뒤 양쪽 문이 옆으로 열리며 메인 화면이 나타납니다.
 */

const EASE = [0.65, 0, 0.35, 1] as const
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function tone(hex: string, t: number) {
  const v = (hex || '#F4C3D2').replace('#', '')
  const rgb = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0)
  return `rgb(${rgb.map((c) => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t)).join(',')})`
}

export function GateEnvelope({
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
  const left = useRef<HTMLDivElement>(null)
  const right = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLDivElement>(null)
  const lace = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLParagraphElement>(null)
  const title = useRef<HTMLParagraphElement>(null)
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
  const cx = W / 2
  const span = Math.min(W * 0.1, 40) // 가운데 선에서 끈 구멍까지
  const band = Math.max(10, Math.min(W, 430) * 0.036) // 리본 폭
  const ribbon = s.ribbonColor || '#F4C3D2'

  // 끈 구멍 (좌·우), 위에서 아래로
  const holes = useMemo(() => {
    const y0 = H * 0.16
    const y1 = H * 0.8
    const n = 7
    return Array.from({ length: n }, (_, i) => y0 + ((y1 - y0) * i) / (n - 1))
  }, [H])
  // 리본 조각: 맨 위 가로 한 줄 + 아래로 X자 교차
  const segs = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; over: boolean; tail?: boolean }[] = []
    out.push({ x1: cx - span, y1: holes[0], x2: cx + span, y2: holes[0], over: true })
    for (let i = 0; i < holes.length - 1; i++) {
      out.push({ x1: cx - span, y1: holes[i], x2: cx + span, y2: holes[i + 1], over: i % 2 === 0 })
      out.push({ x1: cx + span, y1: holes[i], x2: cx - span, y2: holes[i + 1], over: i % 2 === 1 })
    }
    // 아래로 살짝 늘어진 끈 끝
    const last = holes[holes.length - 1]
    out.push({ x1: cx - span, y1: last, x2: cx - span * 1.7, y2: last + H * 0.085, over: true, tail: true })
    out.push({ x1: cx + span, y1: last, x2: cx + span * 1.7, y2: last + H * 0.085, over: true, tail: true })
    return out
  }, [holes, cx, span, H])

  const d = parseWedding(content.wedding)
  const h12 = d.hh % 12 === 0 ? 12 : d.hh % 12
  const dateText = `${d.y}. ${String(d.m).padStart(2, '0')}. ${String(d.d).padStart(2, '0')}`
  const timeText = `${DAYS[d.weekday]} ${h12}:${String(d.mm).padStart(2, '0')} ${d.hh < 12 ? 'AM' : 'PM'}`
  const half = W / 2 - span - band // 글씨가 들어갈 한쪽 폭
  const nameSize = (n: string) => Math.max(13, Math.min(22, (half * 0.92) / Math.max(1, n.length * 0.8)))

  // 흰 새틴: 부드러운 사선 광택
  const satin = (dir: number) => ({
    backgroundColor: s.envelopeColor || '#FBFAF8',
    backgroundImage: `linear-gradient(${dir}deg, rgba(255,255,255,0) 8%, rgba(255,255,255,.85) 26%, rgba(0,0,0,.035) 44%, rgba(255,255,255,.7) 62%, rgba(0,0,0,.025) 82%, rgba(255,255,255,.4) 100%)`,
  })

  async function open() {
    if (opening.current) return
    opening.current = true
    if (!motionOn) {
      await animate(root.current!, { opacity: 0 }, { duration: 0.45 })
      onOpened()
      return
    }
    void animate(hint.current!, { opacity: 0 }, { duration: 0.3 * k })
    void animate(title.current!, { opacity: 0 }, { duration: 0.5 * k, delay: 0.3 * k })
    // 1) 리본이 위에서부터 차례로 풀림
    const pieces = Array.from(lace.current!.querySelectorAll<HTMLElement>('[data-seg]'))
    pieces.forEach((el, i) => {
      const dir = Number(el.dataset.dir)
      void animate(el, { opacity: 0, x: dir * 14, scaleX: 0.5 }, { duration: 0.35 * k, delay: i * 0.035 * k, ease: 'easeIn' })
    })
    await new Promise((r) => setTimeout(r, (pieces.length * 35 + 120) * k))
    // 2) 양쪽 문이 옆으로 열림
    onReveal()
    pageY.set(H * 0.05)
    const dur = 1.25 * k
    await Promise.all([
      animate(left.current!, { rotateY: -105, opacity: [1, 1, 0] }, { duration: dur, ease: [0.45, 0, 0.2, 1] }),
      animate(right.current!, { rotateY: 105, opacity: [1, 1, 0] }, { duration: dur, ease: [0.45, 0, 0.2, 1] }),
      animate(lace.current!, { opacity: 0 }, { duration: 0.4 * k }),
      animate(back.current!, { opacity: 0 }, { duration: dur * 0.8, delay: dur * 0.2, ease: 'easeOut' }),
      animate(pageY, 0, { duration: dur, ease: EASE }),
    ])
    onOpened()
  }

  const serif = { fontFamily: 'var(--f-serif)', color: 'var(--c-text)' }
  const Names = ({ role, name, line }: { role: string; name: string; line: string }) => (
    <div className="absolute text-center" style={{ top: H * 0.4, width: '100%', left: 0 }}>
      <p className="text-[0.62rem] uppercase tracking-[0.32em]" style={{ ...serif, color: 'var(--c-muted)' }}>
        {role}
      </p>
      <p className="mt-2 uppercase tracking-[0.04em]" style={{ ...serif, fontSize: nameSize(name) }}>
        {name}
      </p>
      <span className="mx-auto mt-4 block h-px w-6" style={{ background: 'var(--c-accent)' }} />
      <p className="mt-4 text-[0.74rem] tracking-[0.12em]" style={serif}>
        {line}
      </p>
    </div>
  )

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{ touchAction: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none', perspective: 1400 }}
      role="dialog"
      aria-label="청첩장 봉투"
      onClick={() => void open()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && void open()}
      tabIndex={-1}
    >
      <div ref={back} className="absolute inset-0" style={{ background: s.liningColor || '#F7F2F3' }} />

      {/* 왼쪽 문 */}
      <div
        ref={left}
        className="absolute bottom-0 left-0 top-0"
        style={{ width: W / 2, transformOrigin: '0% 50%', willChange: 'transform', boxShadow: 'inset -1px 0 0 rgba(0,0,0,.08)', ...satin(115) }}
      >
        <div className="absolute" style={{ left: 0, width: W / 2 - span - band / 2 }}>
          <Names role="the groom" name={content.couple.groomEn || content.couple.groomKo} line={dateText} />
        </div>
        {holes.map((y, i) => (
          <span key={i} className="absolute" style={{ left: cx - span - 6, top: y - 6, zIndex: 3 }}>
            <Pearl size={12} />
          </span>
        ))}
      </div>
      {/* 오른쪽 문 */}
      <div
        ref={right}
        className="absolute bottom-0 right-0 top-0"
        style={{ width: W / 2, transformOrigin: '100% 50%', willChange: 'transform', boxShadow: 'inset 1px 0 0 rgba(0,0,0,.08), -6px 0 14px -10px rgba(0,0,0,.25)', ...satin(65) }}
      >
        <div className="absolute" style={{ right: 0, width: W / 2 - span - band / 2 }}>
          <Names role="the bride" name={content.couple.brideEn || content.couple.brideKo} line={timeText} />
        </div>
        {holes.map((y, i) => (
          <span key={i} className="absolute" style={{ left: span - 6, top: y - 6 }}>
            <Pearl size={12} />
          </span>
        ))}
      </div>

      {/* 맨 위 문구 */}
      <p ref={title} className="pointer-events-none absolute inset-x-0 text-center" style={{ top: H * 0.055, ...serif }}>
        <span className="text-[0.78rem] tracking-[0.3em]">THE </span>
        <span className="font-script text-[1.7rem]">Wedding</span>
        <span className="text-[0.78rem] tracking-[0.3em]"> OF</span>
      </p>

      {/* 새틴 리본 끈 + 진주 구멍 */}
      <div ref={lace} className="pointer-events-none absolute inset-0" style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,.16))' }}>
        {segs.map((g, i) => {
          const len = Math.hypot(g.x2 - g.x1, g.y2 - g.y1)
          const ang = (Math.atan2(g.y2 - g.y1, g.x2 - g.x1) * 180) / Math.PI
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: g.x1,
                top: g.y1 - band / 2,
                width: len + (g.tail ? 0 : band * 0.2),
                height: band,
                transformOrigin: `0 ${band / 2}px`,
                transform: `rotate(${ang}deg)`,
                zIndex: g.over ? 2 : 1,
              }}
            >
              <div
                data-seg
                data-dir={g.x2 > g.x1 ? 1 : -1}
                className="h-full w-full"
                style={{
                  borderRadius: g.tail ? 0 : 1,
                  clipPath: g.tail ? `polygon(0 0, 100% 0, calc(100% - ${band * 0.55}px) 50%, 100% 100%, 0 100%)` : undefined,
                  background: `linear-gradient(180deg, ${tone(ribbon, -0.1)} 0%, ${tone(ribbon, 0.18)} 22%, ${tone(ribbon, 0.42)} 40%, ${tone(ribbon, 0.12)} 62%, ${tone(ribbon, 0.02)} 84%, ${tone(ribbon, -0.12)} 100%)`,
                }}
              />
            </div>
          )
        })}
        {/* 리본 위에 보이는 진주 구멍 (문에도 같은 자리에 진주가 있어 리본이 사라져도 그대로 남음) */}
        {holes.flatMap((y, i) =>
          [-1, 1].map((sgn) => (
            <span key={`${i}${sgn}`} className="absolute" style={{ left: cx + sgn * span - 6, top: y - 6, zIndex: 3 }}>
              <Pearl size={12} />
            </span>
          )),
        )}
      </div>

      <p
        ref={hint}
        className="pointer-events-none absolute inset-x-0 text-center text-[0.62rem] uppercase tracking-[0.42em]"
        style={{ ...serif, color: 'var(--c-muted)', bottom: 'calc(3.5% + var(--safe-bottom))' }}
      >
        {!s.hint || /seal/i.test(s.hint) ? 'Tap anywhere to open' : s.hint}
      </p>
    </div>
  )
}
