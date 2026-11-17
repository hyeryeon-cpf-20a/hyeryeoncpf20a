import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type ReactNode } from 'react'

/**
 * 봉투를 감싼 오간자(시스루) 리본과 풍성한 나비 매듭.
 * - 평소: 긴 꼬리가 바람에 살랑임
 * - untie(): 매듭이 풀리며 고리가 사라지고, 리본 끝들이 화면 전체에서 물결치다 아래로 떨어짐
 * 매 프레임 SVG 좌표를 직접 갱신해 리렌더 없이 가볍게 동작합니다.
 */

export interface RibbonHandle {
  untie: (k: number) => Promise<void>
}

interface Props {
  color: string
  vw: number
  vh: number
  cx: number
  cy: number
  /** 봉투 가로 폭 (매듭 크기 기준) */
  envWidth: number
  onBowClick: () => void
  label: string
  /** 매듭 가운데 장식 (실링왁스 등) */
  center?: ReactNode
}

const N = 44

function hexToRgb(h: string) {
  const v = (h || '#ffffff').replace('#', '')
  const f = v.length === 3 ? v.split('').map((c) => c + c).join('') : v
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0)
}
function mix(rgb: number[], to: number[], t: number) {
  return `rgb(${rgb.map((c, i) => Math.round(c + (to[i] - c) * t)).join(',')})`
}

type Pt = [number, number]

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

export const Ribbon = forwardRef<RibbonHandle, Props>(function Ribbon({ color, vw, vh, cx, cy, envWidth, onBowClick, label, center }, ref) {
  const rgb = useMemo(() => hexToRgb(color), [color])
  const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
  // 밝은 리본(화이트·아이보리)은 가장자리를 살짝 어둡게, 진한 리본은 밝게 — 와이어 엣지 느낌
  const edge = lum > 0.82 ? mix(rgb, [120, 108, 98], 0.42) : mix(rgb, [255, 255, 255], 0.5)
  const fill = mix(rgb, [255, 255, 255], lum > 0.82 ? 0 : 0.08)
  const fold = lum > 0.82 ? mix(rgb, [110, 100, 92], 0.3) : mix(rgb, [0, 0, 0], 0.18)
  const sheer = lum > 0.82 ? 0.55 : 0.42 // 비침 정도

  const b = envWidth / 340 // 매듭 크기 배율
  const width = Math.max(14, envWidth * 0.075)

  const svg = useRef<SVGSVGElement>(null)
  const bow = useRef<SVGGElement>(null)
  const centerRef = useRef<SVGGElement>(null)
  const raf = useRef(0)
  const untieStart = useRef<number | null>(null)
  const els = useRef<{ body: SVGPathElement; e1: SVGPolylineElement; e2: SVGPolylineElement; shine: SVGPolylineElement }[]>([])

  // 리본 갈래: 가로 띠 왼쪽/오른쪽 + 길게 늘어진 꼬리 두 개. s=0 이 매듭 쪽
  const strands = useMemo(() => {
    const line = (to: Pt): Pt[] =>
      Array.from({ length: N }, (_, i) => {
        const s = i / (N - 1)
        return [cx + (to[0] - cx) * s, cy + (to[1] - cy) * s + Math.sin(s * Math.PI) * 2] as Pt
      })
    const tail = (m: number, len: number): Pt[] =>
      Array.from({ length: N }, (_, i) =>
        cubic([cx + m * 6 * b, cy + 8 * b], [cx + m * 46 * b, cy + 70 * b], [cx + m * 8 * b, cy + 130 * b], [cx + m * 62 * b, cy + len * b], i / (N - 1)),
      )
    return [
      { base: line([-60, cy + 6]), ph: 0.4, idle: 0.15, w: 1 },
      { base: line([vw + 60, cy - 4]), ph: 2.1, idle: 0.15, w: 1 },
      { base: tail(-1, 215), ph: 3.3, idle: 1, w: 0.92 },
      { base: tail(1, 195), ph: 4.7, idle: 1, w: 0.92 },
    ]
  }, [cx, cy, vw, b])

  /** idle: 매듭을 풀기 전 경과 시간 / t: 풀리기 시작한 뒤 경과 시간 */
  const draw = (idle: number, t: number) => {
    const ramp = Math.min(1, Math.max(0, t) / 0.8)
    const ease = ramp * ramp * (3 - 2 * ramp)
    const g = vh * 0.8
    strands.forEach((st, si) => {
      const e = els.current[si]
      if (!e) return
      const pts: Pt[] = []
      const tw: number[] = []
      const [bx0, by0] = st.base[0]
      const [bx1, by1] = st.base[N - 1]
      const dl = Math.hypot(bx1 - bx0, by1 - by0) || 1
      const dir: Pt = [(bx1 - bx0) / dl, (by1 - by0) / dl]
      for (let i = 0; i < N; i++) {
        const s = i / (N - 1)
        let [x, y] = st.base[i]
        // 평소: 꼬리 끝이 바람에 살랑
        const breeze = st.idle * s * s * 7 * b * Math.sin(idle * 1.6 + s * 3 + st.ph)
        x += breeze
        y += breeze * 0.25
        if (t > 0) {
          const slide = ease * Math.min(dl * 0.3, vw * 0.22) * (1 - s)
          x += dir[0] * slide
          y += dir[1] * slide
          const amp = ease * vw * 0.14 * (1 - 0.4 * s)
          x += amp * Math.sin(6 * s - 6.3 * t + st.ph)
          y += amp * 0.7 * Math.cos(5.2 * s - 5.4 * t + st.ph)
          y += 0.5 * g * Math.max(0, t - 0.3) ** 2 * (1 - 0.45 * s)
        }
        pts.push([x, y])
        tw.push(ease * 1.4 * Math.sin(4.4 * s - 5 * t + st.ph * 1.3) + 0.25 * Math.sin(s * 5 + st.ph + idle * 0.8) * st.idle)
      }
      // 리본 윤곽 (꼬임에 따라 폭이 좁아졌다 넓어짐) + 양쪽 와이어 엣지
      const L: Pt[] = []
      const R: Pt[] = []
      for (let i = 0; i < N; i++) {
        const a = pts[Math.max(0, i - 1)]
        const c = pts[Math.min(N - 1, i + 1)]
        const ax = c[0] - a[0]
        const ay = c[1] - a[1]
        const l = Math.hypot(ax, ay) || 1
        const nx = -ay / l
        const ny = ax / l
        // 꼬리 끝은 V자로 잘린 모양
        const taper = si >= 2 && i > N - 4 ? 1 - (i - (N - 4)) * 0.12 : 1
        const hw = (width / 2) * st.w * (0.14 + 0.86 * Math.abs(Math.cos(tw[i]))) * taper
        L.push([pts[i][0] + nx * hw, pts[i][1] + ny * hw])
        R.push([pts[i][0] - nx * hw, pts[i][1] - ny * hw])
      }
      const f = (p: Pt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`
      e.body.setAttribute('d', `M${L.map(f).join(' L')} L${R.slice().reverse().map(f).join(' L')} Z`)
      e.e1.setAttribute('points', L.map(f).join(' '))
      e.e2.setAttribute('points', R.map(f).join(' '))
      e.shine.setAttribute('points', pts.map(f).join(' '))
    })
  }

  // 평소 살랑임 + 풀리는 애니메이션을 한 루프에서
  const pendingResolve = useRef<(() => void) | null>(null)
  const kRef = useRef(1)
  useEffect(() => {
    const start = performance.now()
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const total = 3
    const tick = (now: number) => {
      const idle = (now - start) / 1000
      let T = -1
      if (untieStart.current !== null) {
        T = (now - untieStart.current) / 1000 / kRef.current
        const press = T < 0.18 ? Math.sin((T / 0.18) * Math.PI) * 0.05 : 0
        const p = Math.min(1, Math.max(0, (T - 0.15) / 0.5))
        const pe = p * p * (3 - 2 * p)
        bow.current?.setAttribute('transform', `translate(${cx} ${cy}) scale(${((1 - press) * (1 - 0.7 * pe)).toFixed(3)}) rotate(${(pe * -18).toFixed(1)})`)
        bow.current?.setAttribute('opacity', (1 - pe).toFixed(3))
        if (T > 0.66 && pendingResolve.current) {
          pendingResolve.current()
          pendingResolve.current = null
        }
        if (svg.current) svg.current.style.opacity = T > total - 0.5 ? String(Math.max(0, (total - T) / 0.5)) : '1'
        if (T >= total) {
          if (svg.current) svg.current.style.display = 'none'
          return
        }
      }
      draw(reduce ? 0 : idle, Math.max(0, T - 0.35))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strands, width])

  useImperativeHandle(ref, () => ({
    untie: (k: number) =>
      new Promise<void>((resolve) => {
        kRef.current = k
        pendingResolve.current = resolve
        untieStart.current = performance.now()
      }),
  }))

  const id = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const sheerFill = { fill, fillOpacity: sheer }
  const edgeStroke = { stroke: edge, strokeOpacity: 0.95, strokeWidth: 1.1, strokeLinejoin: 'round' as const, fill: 'none' }

  /**
   * 나비 고리: 리본 띠가 접혀 만든 고리 — 바깥·안쪽 두 가장자리와 비치는 천, 가운데는 뚫려 있음.
   * 큰 고리와 작은 고리를 겹쳐 풍성한 더블 리본으로.
   */
  const loops = useMemo(() => {
    const bw = width / b // 매듭 좌표계에서의 리본 폭
    const band = (p0: Pt, c1: Pt, c2: Pt, p1: Pt, c3: Pt, c4: Pt, p2: Pt, wMax: number) => {
      const M = 60
      const pts: Pt[] = []
      for (let i = 0; i < M; i++) pts.push(cubic(p0, c1, c2, p1, i / (M - 1)))
      for (let i = 1; i < M; i++) pts.push(cubic(p1, c3, c4, p2, i / (M - 1)))
      const n = pts.length
      const L: Pt[] = []
      const R: Pt[] = []
      for (let i = 0; i < n; i++) {
        const a0 = pts[Math.max(0, i - 1)]
        const a1 = pts[Math.min(n - 1, i + 1)]
        const ax = a1[0] - a0[0]
        const ay = a1[1] - a0[1]
        const l = Math.hypot(ax, ay) || 1
        const u = i / (n - 1)
        // 매듭 쪽(양 끝)은 오므려지고, 고리 중간은 넓게 펼쳐짐 + 한 번 살짝 꼬임
        const gather = Math.pow(Math.sin(Math.PI * u), 0.55)
        const twist = 0.55 + 0.45 * Math.abs(Math.cos(u * Math.PI * 1.15 + 0.4))
        const hw = (wMax / 2) * (0.18 + 0.82 * gather) * twist
        L.push([pts[i][0] - (ay / l) * hw, pts[i][1] + (ax / l) * hw])
        R.push([pts[i][0] + (ay / l) * hw, pts[i][1] - (ax / l) * hw])
      }
      const f = (p: Pt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`
      return { d: `M${L.map(f).join(' L')} L${R.slice().reverse().map(f).join(' L')} Z`, L: L.map(f).join(' '), R: R.map(f).join(' '), C: pts.map(f).join(' ') }
    }
    return {
      big: band([6, -2], [10, -70], [110, -96], [132, -46], [148, -8], [70, 30], [6, 6], bw * 1.85),
      small: band([4, 2], [30, -40], [96, -54], [104, -24], [110, 4], [56, 26], [4, 6], bw * 1.4),
      drop: band([4, 6], [30, 30], [80, 48], [114, 30], [92, 44], [40, 34], [4, 8], bw * 1.05),
    }
  }, [width, b])

  const Band = ({ d, L, R, C, op = 1 }: { d: string; L: string; R: string; C: string; op?: number }) => (
    <g>
      <path d={d} style={{ ...sheerFill, fillOpacity: sheer * op }} />
      <polyline points={L} style={edgeStroke} />
      <polyline points={R} style={{ ...edgeStroke, strokeOpacity: 0.8 }} />
      <polyline points={C} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" />
    </g>
  )

  const Loop = ({ m, rot, sc }: { m: 1 | -1; rot: number; sc: number }) => (
    <g transform={`scale(${m * sc} ${sc}) rotate(${rot})`}>
      <Band {...loops.drop} op={0.85} />
      <Band {...loops.big} />
      <Band {...loops.small} op={0.9} />
    </g>
  )

  return (
    <svg ref={svg} className="pointer-events-none absolute inset-0" width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} style={{ zIndex: 5, overflow: 'visible' }}>
      <defs>
        <filter id={`sh${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#2a2018" floodOpacity=".14" />
        </filter>
      </defs>

      {/* 리본 띠 + 꼬리 */}
      <g>
        {strands.map((_, si) => (
          <g
            key={si}
            ref={(el) => {
              if (!el) return
              els.current[si] = {
                body: el.querySelector('path')!,
                e1: el.querySelectorAll('polyline')[0] as SVGPolylineElement,
                e2: el.querySelectorAll('polyline')[1] as SVGPolylineElement,
                shine: el.querySelectorAll('polyline')[2] as SVGPolylineElement,
              }
            }}
          >
            <path style={sheerFill} fillRule="nonzero" />
            <polyline style={edgeStroke} />
            <polyline style={edgeStroke} />
            <polyline fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth={Math.max(1.5, width * 0.18)} strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* 풍성한 나비 매듭 */}
      <g ref={bow} transform={`translate(${cx} ${cy})`}>
        <g transform={`scale(${b})`}>
          <Loop m={-1} rot={-6} sc={1.04} />
          <Loop m={1} rot={4} sc={1} />
          {/* 매듭: 오므려 묶인 천 */}
          <path d="M-15 -16 C -5 -22, 7 -22, 15 -14 C 20 -3, 18 11, 10 18 C 1 22, -10 21, -16 13 C -21 3, -20 -8, -15 -16 Z" style={{ ...sheerFill, fillOpacity: Math.min(0.92, sheer * 1.45) }} />
          <path d="M-15 -16 C -5 -22, 7 -22, 15 -14 C 20 -3, 18 11, 10 18 C 1 22, -10 21, -16 13 C -21 3, -20 -8, -15 -16 Z" style={edgeStroke} />
          <g fill="none" stroke={fold} strokeOpacity=".35" strokeWidth="1" strokeLinecap="round">
            <path d="M-9 -15 C -6 -4, -6 6, -9 16" />
            <path d="M0 -17 C 2 -4, 2 8, 0 19" />
            <path d="M8 -15 C 10 -4, 10 6, 7 16" />
          </g>
          {center && <g ref={centerRef}>{center}</g>}
        </g>
      </g>

      {/* 매듭 터치 영역 */}
      <foreignObject x={cx - 140 * b} y={cy - 95 * b} width={280 * b} height={190 * b} style={{ pointerEvents: 'auto' }}>
        <button
          type="button"
          onClick={onBowClick}
          aria-label={label}
          style={{ width: '100%', height: '100%', background: 'transparent', border: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        />
      </foreignObject>
    </svg>
  )
})
