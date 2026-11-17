import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type ReactNode } from 'react'

/**
 * 봉투를 세로로 감싼 새틴 리본 + 클래식 나비 매듭 (고리 2개 · 작은 매듭 · V자 꼬리 2개).
 * 색은 관리자가 고른 한 가지 색에서 그림자·광택 단계를 만들어 칠합니다.
 * untie(): 매듭이 풀려 사라지고, 리본 끝이 화면 전체에서 물결치다 아래로 떨어집니다.
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
  /** 세로 띠가 걸치는 봉투 위·아래 */
  top: number
  bottom: number
  envWidth: number
  onBowClick: () => void
  label: string
  center?: ReactNode
}

const N = 44
type Pt = [number, number]

function hexToRgb(h: string) {
  const v = (h || '#B08D57').replace('#', '')
  const f = v.length === 3 ? v.split('').map((c) => c + c).join('') : v
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0)
}
/** t<0 어둡게 / t>0 밝게 */
function tone(rgb: number[], t: number) {
  return `rgb(${rgb.map((c) => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t)).join(',')})`
}

export const Ribbon = forwardRef<RibbonHandle, Props>(function Ribbon({ color, vw, vh, cx, cy, top, bottom, envWidth, onBowClick, label, center }, ref) {
  const rgb = useMemo(() => hexToRgb(color), [color])
  const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
  // 아주 밝은 색(화이트·아이보리)은 그림자를 조금 더 진하게 해야 새틴 결이 보임
  const D = lum > 0.85 ? 1.35 : 1
  const c = {
    deep: tone(rgb, -0.5 * D),
    dark: tone(rgb, -0.3 * D),
    shade: tone(rgb, -0.14 * D),
    base: tone(rgb, 0),
    light: tone(rgb, 0.32),
    spec: tone(rgb, 0.72),
  }

  const b = envWidth / 330 // 매듭 크기 배율
  const width = Math.max(16, envWidth * 0.085) // 띠 폭(px)

  const svg = useRef<SVGSVGElement>(null)
  const bow = useRef<SVGGElement>(null)
  const raf = useRef(0)
  const untieStart = useRef<number | null>(null)
  const pendingResolve = useRef<(() => void) | null>(null)
  const kRef = useRef(1)
  const els = useRef<{ body: SVGPathElement; quads: SVGPolygonElement[]; hl: SVGPolylineElement }[]>([])

  // 세로 띠 위/아래 갈래 (매듭 쪽이 s=0)
  const strands = useMemo(
    () => [
      { from: [cx, cy - 6] as Pt, to: [cx, top - 2] as Pt, ph: 0.5 },
      { from: [cx, cy + 6] as Pt, to: [cx, bottom + 2] as Pt, ph: 2.3 },
    ],
    [cx, cy, top, bottom],
  )

  const draw = (t: number) => {
    const ramp = Math.min(1, Math.max(0, t) / 0.8)
    const ease = ramp * ramp * (3 - 2 * ramp)
    const g = vh * 0.8
    strands.forEach((st, si) => {
      const e = els.current[si]
      if (!e) return
      const dx = st.to[0] - st.from[0]
      const dy = st.to[1] - st.from[1]
      const len = Math.hypot(dx, dy) || 1
      const dir: Pt = [dx / len, dy / len]
      const pts: Pt[] = []
      const tw: number[] = []
      for (let i = 0; i < N; i++) {
        const s = i / (N - 1)
        let x = st.from[0] + dx * s
        let y = st.from[1] + dy * s
        if (t > 0) {
          // 풀린 끝이 미끄러져 나가고, 좌우로 크게 물결치며 화면 아래로 떨어짐
          const slide = ease * Math.min(len * 0.4, vh * 0.2) * (1 - s)
          x += dir[0] * slide
          y += dir[1] * slide
          const amp = ease * vw * 0.2 * (1 - 0.35 * s)
          x += amp * Math.sin(6 * s - 6.3 * t + st.ph)
          y += amp * 0.4 * Math.cos(5.2 * s - 5.6 * t + st.ph)
          y += 0.5 * g * Math.max(0, t - 0.3) ** 2 * (1 - 0.45 * s)
        }
        pts.push([x, y])
        tw.push(ease * 1.4 * Math.sin(4.4 * s - 5 * t + st.ph * 1.3))
      }
      let hl = ''
      const Lp: string[] = []
      const Rp: string[] = []
      for (let i = 0; i < N - 1; i++) {
        const [x0, y0] = pts[i]
        const [x1, y1] = pts[i + 1]
        const l = Math.hypot(x1 - x0, y1 - y0) || 1
        const nx = -(y1 - y0) / l
        const ny = (x1 - x0) / l
        const c0 = Math.cos(tw[i])
        const c1 = Math.cos(tw[i + 1])
        const w0 = (width / 2) * (0.16 + 0.84 * Math.abs(c0))
        const w1 = (width / 2) * (0.16 + 0.84 * Math.abs(c1))
        Lp.push(`${(x0 + nx * w0).toFixed(1)},${(y0 + ny * w0).toFixed(1)}`)
        Rp.push(`${(x0 - nx * w0).toFixed(1)},${(y0 - ny * w0).toFixed(1)}`)
        if (i === N - 2) {
          Lp.push(`${(x1 + nx * w1).toFixed(1)},${(y1 + ny * w1).toFixed(1)}`)
          Rp.push(`${(x1 - nx * w1).toFixed(1)},${(y1 - ny * w1).toFixed(1)}`)
        }
        const q = e.quads[i]
        q.setAttribute(
          'points',
          `${(x0 + nx * w0).toFixed(1)},${(y0 + ny * w0).toFixed(1)} ${(x1 + nx * w1).toFixed(1)},${(y1 + ny * w1).toFixed(1)} ${(x1 - nx * w1).toFixed(1)},${(y1 - ny * w1).toFixed(1)} ${(x0 - nx * w0).toFixed(1)},${(y0 - ny * w0).toFixed(1)}`,
        )
        // 새틴 광택: 길이 방향으로 천천히 밝아졌다 어두워짐 + 꼬이면 뒷면이 어둡게
        const s = i / (N - 1)
        const sheen = 0.16 * Math.sin(s * 6 + st.ph + t * 2) + 0.05
        const lt = c0 > 0 ? sheen * c0 - (1 - c0) * 0.12 : -0.22 - 0.1 * -c0
        const fill = tone(rgb, Math.max(-0.5, Math.min(0.5, lt * D)))
        q.setAttribute('fill', fill)
        q.setAttribute('stroke', fill)
        hl += `${x0.toFixed(1)},${y0.toFixed(1)} `
      }
      e.body.setAttribute('d', `M${Lp.join(' L')} L${Rp.reverse().join(' L')} Z`)
      e.hl.setAttribute('points', hl)
      e.hl.setAttribute('stroke-opacity', String(0.28 * (1 - ease * 0.6)))
    })
  }

  useEffect(() => {
    draw(0)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strands, rgb, width])

  useImperativeHandle(ref, () => ({
    untie: (k: number) =>
      new Promise<void>((resolve) => {
        kRef.current = k
        pendingResolve.current = resolve
        untieStart.current = performance.now()
        const total = 3
        const tick = (now: number) => {
          const T = (now - untieStart.current!) / 1000 / kRef.current
          // 살짝 당겼다가 → 고리가 매듭 속으로 빠져나가며 사라짐
          const press = T < 0.18 ? Math.sin((T / 0.18) * Math.PI) * 0.05 : 0
          const p = Math.min(1, Math.max(0, (T - 0.15) / 0.55))
          const pe = p * p * (3 - 2 * p)
          bow.current?.setAttribute(
            'transform',
            `translate(${cx} ${cy + pe * 40 * b}) scale(${((1 - press) * (1 - 0.6 * pe)).toFixed(3)}) rotate(${(pe * -14).toFixed(1)})`,
          )
          bow.current?.setAttribute('opacity', (1 - pe).toFixed(3))
          draw(Math.max(0, T - 0.3))
          if (T > 0.7 && pendingResolve.current) {
            pendingResolve.current()
            pendingResolve.current = null
          }
          if (svg.current) svg.current.style.opacity = T > total - 0.5 ? String(Math.max(0, (total - T) / 0.5)) : '1'
          if (T < total) raf.current = requestAnimationFrame(tick)
          else if (svg.current) svg.current.style.display = 'none'
        }
        raf.current = requestAnimationFrame(tick)
      }),
  }))

  const id = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const u = (n: string) => `url(#${n}${id})`

  /** 고리 한쪽 (오른쪽 기준). 왼쪽은 좌우 반전 + 약간 다르게 */
  const Loop = ({ m, rot, sc }: { m: 1 | -1; rot: number; sc: number }) => (
    <g transform={`scale(${m * sc} ${sc * 1.22}) rotate(${rot})`}>
      {/* 고리 안쪽(뒷면) — 아래쪽으로 살짝 보이는 어두운 면 */}
      <path d="M8 6 C 50 6, 100 0, 124 -18 C 118 -2, 84 12, 40 14 C 26 14, 14 12, 8 6 Z" fill={u('in')} />
      {/* 고리 바깥면 */}
      <path d="M7 -10 C 28 -38, 66 -66, 106 -64 C 124 -63, 134 -48, 128 -30 C 122 -14, 94 0, 60 4 C 36 6, 18 6, 7 6 Z" fill={u('loop')} />
      {/* 길게 지나가는 광택 띠 */}
      <path d="M24 -26 C 44 -46, 74 -58, 104 -56 C 114 -55, 120 -50, 121 -44 C 104 -48, 70 -40, 34 -18 Z" fill={u('spec')} opacity=".85" />
      {/* 아래쪽 은은한 반사 */}
      <path d="M40 -2 C 70 -6, 104 -16, 124 -30 C 120 -20, 96 -6, 56 0 Z" fill={c.light} opacity=".35" />
      {/* 매듭으로 모이는 주름 */}
      <g fill="none" strokeLinecap="round">
        <path d="M9 -6 C 22 -18, 36 -28, 52 -36" stroke={c.deep} strokeOpacity=".35" strokeWidth="1.4" />
        <path d="M10 0 C 26 -4, 42 -10, 58 -14" stroke={c.deep} strokeOpacity=".28" strokeWidth="1.2" />
        <path d="M12 -2 C 28 -10, 44 -18, 60 -24" stroke={c.spec} strokeOpacity=".35" strokeWidth="1" />
      </g>
      {/* 가장자리 그림자 선 */}
      <path d="M7 -10 C 28 -38, 66 -66, 106 -64 C 124 -63, 134 -48, 128 -30" fill="none" stroke={c.dark} strokeOpacity=".35" strokeWidth=".8" />
    </g>
  )

  /** 꼬리 한쪽 (오른쪽 기준) — 끝은 V자로 잘림 */
  const Tail = ({ m, rot, len }: { m: 1 | -1; rot: number; len: number }) => {
    const L = len
    return (
      <g transform={`scale(${m} 1) rotate(${rot})`}>
        <path
          d={`M-2 6 C 10 ${L * 0.3}, 22 ${L * 0.62}, 30 ${L} L 46 ${L - 18} L 66 ${L - 6} C 54 ${L * 0.62}, 34 ${L * 0.28}, 14 4 Z`}
          fill={u('tail')}
        />
        {/* 꼬리 위쪽 접힌 그림자 */}
        <path d={`M-2 6 C 6 ${L * 0.16}, 12 ${L * 0.26}, 18 ${L * 0.34} C 22 ${L * 0.22}, 18 ${L * 0.1}, 14 4 Z`} fill={c.deep} opacity=".35" />
        {/* 광택 */}
        <path d={`M16 ${L * 0.32} C 25 ${L * 0.5}, 33 ${L * 0.66}, 39 ${L * 0.8}`} fill="none" stroke={c.spec} strokeOpacity=".5" strokeWidth="5" strokeLinecap="butt" />
        <path d={`M-2 6 C 10 ${L * 0.3}, 22 ${L * 0.62}, 30 ${L}`} fill="none" stroke={c.dark} strokeOpacity=".3" strokeWidth=".8" />
      </g>
    )
  }

  return (
    <svg ref={svg} className="pointer-events-none absolute inset-0" width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} style={{ zIndex: 5, overflow: 'visible' }}>
      <defs>
        <linearGradient id={`loop${id}`} x1="0" y1="1" x2=".9" y2="0">
          <stop offset="0" stopColor={c.dark} />
          <stop offset=".3" stopColor={c.shade} />
          <stop offset=".55" stopColor={c.base} />
          <stop offset=".78" stopColor={c.light} />
          <stop offset="1" stopColor={c.shade} />
        </linearGradient>
        <linearGradient id={`in${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c.deep} />
          <stop offset=".6" stopColor={c.dark} />
          <stop offset="1" stopColor={c.shade} />
        </linearGradient>
        <linearGradient id={`spec${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={c.spec} stopOpacity="0" />
          <stop offset=".45" stopColor={c.spec} stopOpacity=".9" />
          <stop offset="1" stopColor={c.spec} stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={`tail${id}`} x1="0" y1="0" x2=".35" y2="1">
          <stop offset="0" stopColor={c.dark} />
          <stop offset=".35" stopColor={c.base} />
          <stop offset=".6" stopColor={c.light} />
          <stop offset="1" stopColor={c.shade} />
        </linearGradient>
        <radialGradient id={`knot${id}`} cx="45%" cy="38%" r="70%">
          <stop offset="0" stopColor={c.light} />
          <stop offset=".55" stopColor={c.base} />
          <stop offset="1" stopColor={c.dark} />
        </radialGradient>
        <filter id={`sh${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#2a2018" floodOpacity=".22" />
        </filter>
      </defs>

      {/* 세로 띠 */}
      <g filter={u('sh')}>
        {strands.map((_, si) => (
          <g
            key={si}
            ref={(el) => {
              if (!el) return
              els.current[si] = {
                body: el.querySelector('path') as SVGPathElement,
                quads: Array.from(el.querySelectorAll('polygon')) as SVGPolygonElement[],
                hl: el.querySelector('polyline') as SVGPolylineElement,
              }
            }}
          >
            <path fill={c.shade} />
            {Array.from({ length: N - 1 }, (_, i) => (
              <polygon key={i} fill={c.base} stroke={c.base} strokeWidth={0.7} strokeLinejoin="round" />
            ))}
            <polyline fill="none" stroke={c.spec} strokeWidth={Math.max(1.5, width * 0.16)} strokeLinecap="round" strokeOpacity=".28" />
          </g>
        ))}
      </g>

      {/* 나비 매듭 */}
      <g ref={bow} transform={`translate(${cx} ${cy})`} filter={u('sh')}>
        <g transform={`scale(${b})`}>
          <Tail m={-1} rot={10} len={112} />
          <Tail m={1} rot={-6} len={104} />
          <Loop m={-1} rot={-13} sc={0.98} />
          <Loop m={1} rot={-10} sc={0.95} />
          {/* 매듭 */}
          <path d="M-13 -15 C -5 -19, 6 -19, 13 -14 C 17 -5, 16 7, 12 15 C 4 19, -6 19, -13 15 C -17 6, -17 -6, -13 -15 Z" fill={u('knot')} />
          <g fill="none" strokeLinecap="round">
            <path d="M-7 -15 C -9 -5, -9 6, -7 15" stroke={c.deep} strokeOpacity=".3" strokeWidth="1.2" />
            <path d="M6 -15 C 8 -5, 8 6, 6 15" stroke={c.deep} strokeOpacity=".3" strokeWidth="1.2" />
            <path d="M-1 -14 C -2 -4, -2 4, -1 12" stroke={c.spec} strokeOpacity=".55" strokeWidth="2.2" />
          </g>
          {center}
        </g>
      </g>

      <foreignObject x={cx - 140 * b} y={cy - 80 * b} width={280 * b} height={210 * b} style={{ pointerEvents: 'auto' }}>
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
