import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'

/**
 * 봉투를 감싼 새틴 리본.
 * untie() 를 호출하면 매듭이 풀리고, 네 갈래의 리본 끝이 화면 전체에서 물결치며 흔들리다 아래로 떨어집니다.
 * (매 프레임 SVG 좌표를 직접 갱신 — 리렌더 없이 가볍게 동작)
 */

export interface RibbonHandle {
  /** 매듭이 풀릴 때까지 기다림. 떨어지는 리본은 그 뒤에도 계속 움직입니다. */
  untie: (k: number) => Promise<void>
}

interface Props {
  color: string
  /** 화면 크기 */
  vw: number
  vh: number
  /** 리본이 교차하는 점(매듭) */
  cx: number
  cy: number
  /** 세로 리본이 걸치는 봉투의 위·아래 */
  top: number
  bottom: number
  width: number
  onBowClick: () => void
  label: string
}

const N = 40 // 리본 한 갈래의 마디 수

function hexToRgb(h: string) {
  const v = h.replace('#', '')
  const f = v.length === 3 ? v.split('').map((c) => c + c).join('') : v
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0)
}
function shadeRgb(rgb: number[], t: number) {
  // t < 0 → 어둡게, t > 0 → 밝게
  return `rgb(${rgb.map((c) => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t)).join(',')})`
}

export const Ribbon = forwardRef<RibbonHandle, Props>(function Ribbon({ color, vw, vh, cx, cy, top, bottom, width, onBowClick, label }, ref) {
  const rgb = useMemo(() => hexToRgb(color), [color])
  const svg = useRef<SVGSVGElement>(null)
  const bow = useRef<SVGGElement>(null)
  const raf = useRef(0)
  const strandsRef = useRef<{ quads: SVGPolygonElement[]; hl: SVGPolylineElement }[]>([])

  // 네 갈래: 왼쪽·오른쪽(가로 띠), 위·아래(세로 띠). s=0 이 매듭 쪽(풀리는 끝)
  const strands = useMemo(
    () => [
      { dx: -1, dy: 0, len: cx + 40, ph: 0.3, side: -1 },
      { dx: 1, dy: 0, len: vw - cx + 40, ph: 1.9, side: 1 },
      { dx: 0, dy: -1, len: cy - top, ph: 3.1, side: -1 },
      { dx: 0, dy: 1, len: bottom - cy, ph: 4.4, side: 1 },
    ],
    [cx, cy, vw, top, bottom],
  )

  /** 시간 t(초, 0 = 풀리기 시작)에서 리본 모양 계산 후 DOM 갱신 */
  const draw = (t: number) => {
    const ramp = Math.min(1, Math.max(0, t) / 0.7)
    const ease = ramp * ramp * (3 - 2 * ramp)
    const g = vh * 0.85
    strands.forEach((st, si) => {
      const els = strandsRef.current[si]
      if (!els) return
      const pts: [number, number][] = []
      const tw: number[] = []
      for (let i = 0; i < N; i++) {
        const s = i / (N - 1)
        let x = cx + st.dx * s * st.len
        let y = cy + st.dy * s * st.len
        if (t > 0) {
          // 풀린 끝이 먼저 미끄러져 나가고, 전체가 물결치며 떨어짐
          const slide = ease * Math.min(st.len * 0.35, vw * 0.25) * (1 - s)
          x += st.dx * slide
          y += st.dy * slide
          const amp = ease * vw * 0.13 * (1 - 0.45 * s)
          const wave = Math.sin(6.2 * s - 6.5 * t + st.ph)
          x += amp * wave * (st.dy !== 0 ? 1 : 0.35)
          y += amp * 0.75 * Math.cos(5.4 * s - 5.6 * t + st.ph) * (st.dx !== 0 ? 1 : 0.4)
          y += 0.5 * g * Math.max(0, t - 0.25) ** 2 * (1 - 0.5 * s)
        }
        pts.push([x, y])
        tw.push(ease * 1.35 * Math.sin(4.6 * s - 5.2 * t + st.ph * 1.3))
      }
      // 각 마디를 사각형으로 — 꼬임에 따라 폭과 밝기가 변해 새틴처럼 보임
      let hl = ''
      for (let i = 0; i < N - 1; i++) {
        const [x0, y0] = pts[i]
        const [x1, y1] = pts[i + 1]
        const ax = x1 - x0
        const ay = y1 - y0
        const l = Math.hypot(ax, ay) || 1
        const nx = -ay / l
        const ny = ax / l
        const c0 = Math.cos(tw[i])
        const c1 = Math.cos(tw[i + 1])
        const w0 = (width / 2) * (0.22 + 0.78 * Math.abs(c0))
        const w1 = (width / 2) * (0.22 + 0.78 * Math.abs(c1))
        const q = els.quads[i]
        q.setAttribute(
          'points',
          `${(x0 + nx * w0).toFixed(1)},${(y0 + ny * w0).toFixed(1)} ${(x1 + nx * w1).toFixed(1)},${(y1 + ny * w1).toFixed(1)} ${(x1 - nx * w1).toFixed(1)},${(y1 - ny * w1).toFixed(1)} ${(x0 - nx * w0).toFixed(1)},${(y0 - ny * w0).toFixed(1)}`,
        )
        const lightness = c0 > 0 ? 0.12 * c0 - 0.02 : -0.16 * -c0 - 0.06 // 뒷면은 더 어둡게
        const fill = shadeRgb(rgb, lightness)
        q.setAttribute('fill', fill)
        q.setAttribute('stroke', fill) // 마디 사이 이음새 메우기
        hl += `${x0.toFixed(1)},${y0.toFixed(1)} `
      }
      els.hl.setAttribute('points', hl)
      els.hl.setAttribute('stroke-opacity', String(0.32 * (1 - ease * 0.5)))
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
        const start = performance.now()
        let resolved = false
        const total = 2.8
        const tick = (now: number) => {
          const T = (now - start) / 1000 / k // 실제 경과(속도 보정)
          // 0~0.18: 매듭을 살짝 당김 / 0.18~0.6: 고리가 풀려 사라짐
          const press = T < 0.18 ? Math.sin((T / 0.18) * Math.PI) * 0.05 : 0
          const p = Math.min(1, Math.max(0, (T - 0.18) / 0.42))
          const pe = p * p * (3 - 2 * p)
          if (bow.current) {
            bow.current.setAttribute('transform', `translate(${cx} ${cy}) scale(${(1 - press) * (1 - 0.75 * pe)}) rotate(${pe * 25})`)
            bow.current.setAttribute('opacity', String(1 - pe))
          }
          draw(Math.max(0, T - 0.32))
          if (!resolved && T > 0.62) {
            resolved = true
            resolve()
          }
          if (svg.current) svg.current.style.opacity = String(T > total - 0.5 ? Math.max(0, (total - T) / 0.5) : 1)
          if (T < total) raf.current = requestAnimationFrame(tick)
          else if (svg.current) svg.current.style.display = 'none'
        }
        raf.current = requestAnimationFrame(tick)
      }),
  }))

  const id = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const b = width / 24 // 매듭 크기 배율
  const dark = shadeRgb(rgb, -0.16)
  const mid = shadeRgb(rgb, 0.04)
  const light = shadeRgb(rgb, 0.34)

  return (
    <svg ref={svg} className="pointer-events-none absolute inset-0" width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} style={{ zIndex: 5, overflow: 'visible' }} aria-hidden={false}>
      <defs>
        <linearGradient id={`lg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark} />
          <stop offset=".45" stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <radialGradient id={`kn${id}`} cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor={light} />
          <stop offset=".7" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <filter id={`sh${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#3a2a20" floodOpacity=".22" />
        </filter>
      </defs>

      {/* 리본 띠 (네 갈래) */}
      <g filter={`url(#sh${id})`}>
        {strands.map((_, si) => (
          <g
            key={si}
            ref={(el) => {
              if (!el) return
              const quads = Array.from(el.querySelectorAll('polygon')) as SVGPolygonElement[]
              const hl = el.querySelector('polyline') as SVGPolylineElement
              strandsRef.current[si] = { quads, hl }
            }}
          >
            {Array.from({ length: N - 1 }, (_, i) => (
              <polygon key={i} fill={mid} stroke={mid} strokeWidth={0.9} strokeLinejoin="round" />
            ))}
            <polyline fill="none" stroke="#fff" strokeWidth={Math.max(1, width * 0.12)} strokeLinecap="round" strokeOpacity=".3" />
          </g>
        ))}
      </g>

      {/* 나비 매듭 */}
      <g ref={bow} transform={`translate(${cx} ${cy})`} filter={`url(#sh${id})`}>
        <g transform={`scale(${b})`}>
          {/* 짧은 꼬리 */}
          {[1, -1].map((m) => (
            <path key={`t${m}`} transform={`scale(${m} 1)`} d="M3 6 C 10 26, 18 46, 30 70 L 24 68 L 20 80 C 10 56, 2 32, -5 9 Z" fill={`url(#lg${id})`} />
          ))}
          {/* 고리 */}
          {[1, -1].map((m) => (
            <g key={`l${m}`} transform={`scale(${m} 1)`}>
              <path d="M0 -1 C 12 -30, 60 -40, 68 -14 C 73 4, 44 14, 0 4 Z" fill={`url(#lg${id})`} />
              <path d="M6 -2 C 20 -20, 48 -26, 56 -13 C 46 -9, 24 -4, 6 -2 Z" fill={dark} opacity=".3" />
              <path d="M10 -14 C 24 -26, 44 -28, 54 -22" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          ))}
          {/* 매듭 */}
          <rect x="-10" y="-11" width="20" height="22" rx="7" fill={`url(#kn${id})`} />
          <path d="M-5 -7 C -2 -9, 3 -9, 5 -6" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      </g>

      {/* 매듭 터치 영역 */}
      <foreignObject x={cx - 60 * b} y={cy - 45 * b} width={120 * b} height={100 * b} style={{ pointerEvents: 'auto' }}>
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
