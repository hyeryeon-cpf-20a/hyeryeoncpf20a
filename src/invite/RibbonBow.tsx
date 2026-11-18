import { useId, useMemo } from 'react'

/**
 * 얇은 새틴 리본으로 묶은 나비 리본 (실링왁스 대신 봉투에 붙는 장식).
 * 고리 2개 · 작은 매듭 · V자로 잘린 꼬리 2개. 색 하나에서 그림자·광택을 만들어 칠합니다.
 */

type Pt = [number, number]

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

/** 중심선을 따라 폭 w(t)인 띠 모양 경로 */
function band(curves: [Pt, Pt, Pt, Pt][], w: (t: number) => number, vCut = 0) {
  const pts: Pt[] = []
  const n = 40
  curves.forEach((c, ci) => {
    for (let i = ci === 0 ? 0 : 1; i <= n; i++) pts.push(cubic(c[0], c[1], c[2], c[3], i / n))
  })
  const L: Pt[] = []
  const R: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    const t = i / (pts.length - 1)
    const hw = w(t) / 2
    L.push([pts[i][0] - (dy / l) * hw, pts[i][1] + (dx / l) * hw])
    R.push([pts[i][0] + (dy / l) * hw, pts[i][1] - (dx / l) * hw])
  }
  const f = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`
  let tip = ''
  if (vCut) {
    // 꼬리 끝 V자 홈
    const e = pts[pts.length - 1]
    const p = pts[pts.length - 2]
    const dx = e[0] - p[0]
    const dy = e[1] - p[1]
    const l = Math.hypot(dx, dy) || 1
    tip = ` L${f([e[0] - (dx / l) * vCut, e[1] - (dy / l) * vCut])}`
  }
  return { d: `M${L.map(f).join(' L')}${tip} L${R.slice().reverse().map(f).join(' L')} Z`, center: pts.map(f).join(' ') }
}

function tone(hex: string, t: number) {
  const v = (hex || '#E8789F').replace('#', '')
  const rgb = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0)
  return `rgb(${rgb.map((c) => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t)).join(',')})`
}

export function RibbonBow({ color = '#E8789F', size = 120 }: { color?: string; size?: number }) {
  const id = useId().replace(/[:«»]/g, '')
  const shapes = useMemo(() => {
    const K: Pt = [100, 50] // 매듭 위치
    const RW = 6.5 // 리본 폭 — 얇은 리본
    const loopW = (t: number) => RW * (0.5 + 0.5 * Math.sin(Math.PI * t) ** 0.5)
    // 고리: 살짝 아래로 처진 물방울 모양 (코케트 리본)
    const loopR = band(
      [
        [K, [114, 28], [158, 18], [170, 36]],
        [[170, 36], [181, 54], [148, 66], K],
      ],
      loopW,
    )
    const loopL = band(
      [
        [K, [86, 28], [42, 18], [30, 36]],
        [[30, 36], [19, 54], [52, 66], K],
      ],
      loopW,
    )
    // 꼬리: 길게 늘어지며 물결치듯 흐름, 끝은 V자
    const tailW = (t: number) => RW * (0.75 + 0.25 * t)
    const tailR = band(
      [
        [[103, 55], [118, 80], [104, 102], [118, 124]],
        [[118, 124], [131, 145], [116, 162], [128, 184]],
      ],
      tailW,
      5,
    )
    const tailL = band(
      [
        [[97, 55], [80, 82], [96, 104], [82, 128]],
        [[82, 128], [70, 150], [86, 166], [72, 186]],
      ],
      tailW,
      5,
    )
    return { loopR, loopL, tailR, tailL }
  }, [])

  const light = tone(color, 0.28)
  const base = tone(color, 0)
  const dark = tone(color, -0.14)
  const deep = tone(color, -0.3)

  return (
    <svg width={size} height={size * 0.97} viewBox="0 0 200 194" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`rb${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset=".45" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`rt${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark} />
          <stop offset=".35" stopColor={base} />
          <stop offset="1" stopColor={light} />
        </linearGradient>
        <radialGradient id={`rk${id}`} cx="45%" cy="35%" r="70%">
          <stop offset="0" stopColor={light} />
          <stop offset=".6" stopColor={base} />
          <stop offset="1" stopColor={deep} />
        </radialGradient>
        <filter id={`rs${id}`} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity=".16" />
        </filter>
      </defs>
      <g filter={`url(#rs${id})`}>
        {/* 꼬리 */}
        <path d={shapes.tailL.d} fill={`url(#rt${id})`} />
        <path d={shapes.tailR.d} fill={`url(#rt${id})`} />
        {/* 고리 */}
        <path d={shapes.loopL.d} fill={`url(#rb${id})`} />
        <path d={shapes.loopR.d} fill={`url(#rb${id})`} />
        {/* 은은한 가장자리 선과 광택 */}
        <g fill="none" stroke={deep} strokeOpacity=".35" strokeWidth=".6" strokeLinejoin="round">
          <path d={shapes.loopL.d} />
          <path d={shapes.loopR.d} />
          <path d={shapes.tailL.d} />
          <path d={shapes.tailR.d} />
        </g>
        <g fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".45" strokeWidth="1.3">
          <polyline points={shapes.loopL.center} strokeDasharray="0 16 40 400" />
          <polyline points={shapes.loopR.center} strokeDasharray="0 16 40 400" />
          <polyline points={shapes.tailL.center} strokeDasharray="0 30 30 400" />
          <polyline points={shapes.tailR.center} strokeDasharray="0 30 30 400" />
        </g>
        {/* 매듭 */}
        <rect x="94" y="43.5" width="12" height="13" rx="5" fill={`url(#rk${id})`} />
        <rect x="94" y="43.5" width="12" height="13" rx="5" fill="none" stroke={deep} strokeOpacity=".35" strokeWidth=".6" />
        <path d="M97 46 C 99 45.2, 101.5 45.2, 103.5 46.4" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  )
}
