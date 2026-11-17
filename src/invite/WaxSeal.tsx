import { useId, useMemo, type ReactNode } from 'react'
import type { EnvelopeSettings } from '../lib/types'

export type WaxEmblem = 'rose' | 'lily' | 'laurel' | 'heart'

export const WAX_EMBLEMS: { value: WaxEmblem; label: string }[] = [
  { value: 'rose', label: '장미' },
  { value: 'lily', label: '은방울꽃 (5월의 꽃)' },
  { value: 'laurel', label: '월계수와 하트' },
  { value: 'heart', label: '하트' },
]

export const WAX_COLORS: { value: string; label: string }[] = [
  { value: '#A86B69', label: '로즈 브라운' },
  { value: '#7E2E36', label: '버건디' },
  { value: '#C79A96', label: '더스티 핑크' },
  { value: '#B39669', label: '샴페인 골드' },
  { value: '#7F8C72', label: '세이지' },
  { value: '#E6DCCB', label: '아이보리' },
]

export function normalizeEmblem(v: string | undefined): WaxEmblem {
  return (['rose', 'lily', 'laurel', 'heart'] as string[]).includes(v ?? '') ? (v as WaxEmblem) : v === 'heart' ? 'heart' : 'rose'
}

/* ------------------------------------------------------------ 형태 도우미 */

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/** 극좌표 함수로 부드러운 닫힌 곡선 */
function polarPath(cx: number, cy: number, r: (a: number) => number, n = 120, rot = 0) {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = r(a)
    const x = cx + Math.cos(a + rot) * rr
    const y = cy + Math.sin(a + rot) * rr
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `
  }
  return d + 'Z'
}

/** 녹아 퍼진 왁스 가장자리 */
function puddle(seed: number) {
  const rnd = rng(seed)
  const p1 = rnd() * 6.28
  const p2 = rnd() * 6.28
  const p3 = rnd() * 6.28
  return polarPath(60, 60, (a) => 47 * (1 + 0.013 * Math.sin(a * 3 + p1) + 0.007 * Math.sin(a * 7 + p2) + 0.004 * Math.sin(a * 13 + p3)), 160)
}

/** 아몬드 모양 잎 (밑동이 원점, 위쪽으로) */
function leaf(len: number, w: number) {
  return `M0 0 C ${w} ${-len * 0.3}, ${w * 0.8} ${-len * 0.75}, 0 ${-len} C ${-w * 0.8} ${-len * 0.75}, ${-w} ${-len * 0.3}, 0 0 Z`
}

const HEART = (s: number) =>
  `M0 ${8 * s} C ${-6.5 * s} ${3.2 * s}, ${-8.5 * s} ${-0.2 * s}, ${-8.5 * s} ${-3.4 * s} C ${-8.5 * s} ${-6.4 * s}, ${-6.1 * s} ${-8.4 * s}, ${-3.6 * s} ${-8.4 * s} C ${-1.8 * s} ${-8.4 * s}, ${-0.6 * s} ${-7.3 * s}, 0 ${-5.8 * s} C ${0.6 * s} ${-7.3 * s}, ${1.8 * s} ${-8.4 * s}, ${3.6 * s} ${-8.4 * s} C ${6.1 * s} ${-8.4 * s}, ${8.5 * s} ${-6.4 * s}, ${8.5 * s} ${-3.4 * s} C ${8.5 * s} ${-0.2 * s}, ${6.5 * s} ${3.2 * s}, 0 ${8 * s} Z`

/* ------------------------------------------------------------ 문양 (여러 겹의 양각 레이어) */

type Layer = ReactNode[]

/** 둥근 꽃잎 (밑동이 원점, 위쪽으로) */
function petal(len: number, w: number) {
  return `M0 0 C ${w * 0.9} ${-len * 0.15}, ${w} ${-len * 0.72}, ${w * 0.5} ${-len * 0.98} C ${w * 0.22} ${-len * 1.06}, ${-w * 0.22} ${-len * 1.06}, ${-w * 0.5} ${-len * 0.98} C ${-w} ${-len * 0.72}, ${-w * 0.9} ${-len * 0.15}, 0 0 Z`
}

function roseLayers(): Layer {
  const C = [60, 55] as const
  const ring = (n: number, len: number, w: number, off: number, key: string) =>
    Array.from({ length: n }, (_, i) => <path key={`${key}${i}`} d={petal(len, w)} transform={`translate(${C[0]} ${C[1]}) rotate(${off + (360 / n) * i})`} />)
  return [
    // 잎과 줄기
    <g key="l">
      <path d="M60 66 C 59.8 72, 59 78, 57.5 84" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      <path d={leaf(13, 4.6)} transform="translate(59.4 74) rotate(-58)" />
      <path d={leaf(11.5, 4.1)} transform="translate(59.2 77.5) rotate(56)" />
    </g>,
    // 바깥 꽃잎 → 안쪽 꽃잎 (각 꽃잎이 따로 빛을 받아 겹친 느낌)
    ...ring(5, 13.2, 8.2, 18, 'a').map((p) => <g key={`g${(p as { key: string }).key}`}>{p}</g>),
    ...ring(5, 9.6, 6.4, 54, 'b').map((p) => <g key={`g${(p as { key: string }).key}`}>{p}</g>),
    ...ring(4, 6.4, 4.6, 10, 'c').map((p) => <g key={`g${(p as { key: string }).key}`}>{p}</g>),
    <g key="bud">
      <circle cx={C[0]} cy={C[1]} r="2.7" />
      <path d="M60.6 55.6 C 59.4 56, 58.6 54.8, 59.6 54 C 60.6 53.3, 62 54.2, 61.8 55.6" fill="none" stroke="currentColor" strokeWidth=".5" strokeLinecap="round" />
    </g>,
  ]
}

function lilyLayers(): Layer {
  // 은방울꽃: 휘어진 꽃대에 매달린 종 모양 꽃
  const bell = (x: number, y: number, s: number, key: string) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s * 1.22} ${s})`}>
      <path d="M0 -4.2 C 0.2 -5.2, 0.4 -6, 0.9 -6.8" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M-3.8 1.8 C -3.9 -2.2, -2.4 -4.4, 0 -4.4 C 2.4 -4.4, 3.9 -2.2, 3.8 1.8 C 3.4 1.2, 2.8 2.9, 1.9 1.9 C 1.3 3, 0.6 1.8, 0 2.8 C -0.6 1.8, -1.3 3, -1.9 1.9 C -2.8 2.9, -3.4 1.2, -3.8 1.8 Z" />
    </g>
  )
  return [
    <g key="leaves">
      <path d="M56.5 87 C 43 79, 39 61, 45.5 43.5 C 54 57, 58.5 72, 56.5 87 Z" />
      <path d="M58.5 87 C 66 80.5, 73 76, 82 74.5 C 77.5 82.5, 69 87.5, 58.5 87 Z" />
    </g>,
    <g key="stem">
      <path d="M57.5 86.5 C 56 70, 60 54, 75 41" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </g>,
    <g key="veins" fill="none" stroke="currentColor" strokeWidth=".55">
      <path d="M46.5 47 C 51 59, 55 72, 56 85" />
      <path d="M60.5 86.3 C 67 81.5, 73.5 77.5, 80 75.5" />
    </g>,
    <g key="bells">
      {bell(58.8, 67.5, 1.5, 'b1')}
      {bell(62, 56.5, 1.36, 'b2')}
      {bell(67.4, 48.6, 1.18, 'b3')}
      {bell(73.4, 43.6, 0.95, 'b4')}
      <circle cx="76.4" cy="40" r="1.7" />
    </g>,
  ]
}

function laurelLayers(): Layer {
  const branch: ReactNode[] = []
  const rnd = rng(5)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const t = i / 9
      const ang = Math.PI / 2 + side * (0.55 + t * 1.75) // 아래 → 위
      const r = 22.5
      const x = 60 + Math.cos(ang) * r
      const y = 60 + Math.sin(ang) * r
      // 가지가 자라는 방향(접선)으로 잎을 세우고, 바깥/안쪽으로 번갈아 기울임
      const base = (Math.atan2(-side * Math.sin(ang), -side * Math.cos(ang)) * 180) / Math.PI
      const len = 7.8 - t * 3 + rnd() * 0.5
      const tilt = (i % 2 ? 1 : -1) * 32
      branch.push(<path key={`${side}${i}`} d={leaf(len, len * 0.33)} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(base + tilt).toFixed(1)})`} />)
    }
  }
  const arc = (side: number) => {
    const a0 = Math.PI / 2 + side * 0.5
    const a1 = Math.PI / 2 + side * 2.3
    const p = (a: number) => `${(60 + Math.cos(a) * 22.5).toFixed(2)} ${(60 + Math.sin(a) * 22.5).toFixed(2)}`
    return `M${p(a0)} A 22.5 22.5 0 0 ${side > 0 ? 1 : 0} ${p(a1)}`
  }
  return [
    <g key="stems" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
      <path d={arc(-1)} />
      <path d={arc(1)} />
    </g>,
    <g key="leaves">{branch}</g>,
    <path key="heart" d={HEART(1.05)} transform="translate(60 60)" />,
  ]
}

function heartLayers(): Layer {
  return [
    <path key="h1" d={HEART(1.55)} transform="translate(60 59)" />,
    <path key="h2" d={HEART(1.18)} transform="translate(60 59.3)" />,
  ]
}

/* ------------------------------------------------------------ 컴포넌트 */

const EMBLEM_SCALE: Record<WaxEmblem, number> = { rose: 1.32, lily: 1.12, laurel: 1.12, heart: 1.45 }

export function WaxSeal({ settings, size = 76 }: { settings: Pick<EnvelopeSettings, 'waxColor' | 'waxEmblem'>; size?: number }) {
  const id = useId().replace(/[:«»]/g, '')
  const outer = useMemo(() => puddle(23), [])
  const color = settings.waxColor || '#A86B69'
  const emblem = normalizeEmblem(settings.waxEmblem)
  const layers = useMemo(
    () => ({ rose: roseLayers, lily: lilyLayers, laurel: laurelLayers, heart: heartLayers })[emblem](),
    [emblem],
  )
  // 밝은 왁스(아이보리 등)는 그림자를 조금 더 진하게
  const shade = mix(color, '#120a08', 0.55)
  const light = parseInt(color.slice(1, 3), 16) + parseInt(color.slice(3, 5), 16) + parseInt(color.slice(5, 7), 16) > 560

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" style={{ display: 'block', overflow: 'visible', color }}>
      <defs>
        {/* 왁스 볼륨: 알파를 높이맵으로 사용한 확산 + 정반사 조명 */}
        <filter id={`gloss${id}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="h" />
          <feSpecularLighting in="h" surfaceScale="5.5" specularConstant="0.8" specularExponent="30" lightingColor="#fff" result="spec">
            <fePointLight x="18" y="-4" z="95" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feDiffuseLighting in="h" surfaceScale="4.5" diffuseConstant="1" lightingColor="#fff" result="diff">
            <feDistantLight azimuth="235" elevation="50" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1="1.06" k2="0" k3="0" k4="0" result="shaded" />
          <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.5" k4="0" />
        </filter>
        {/* 양각 레이어: 레이어마다 가장자리에 빛과 그림자 */}
        <filter id={`emb${id}`} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.9" result="h" />
          <feSpecularLighting in="h" surfaceScale="2.2" specularConstant="0.85" specularExponent="16" lightingColor="#fff" result="spec">
            <fePointLight x="18" y="-4" z="75" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feDiffuseLighting in="h" surfaceScale="2.2" diffuseConstant="1" lightingColor="#fff" result="diff">
            <feDistantLight azimuth="235" elevation="46" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1="1.1" k2="0" k3="0" k4="0" result="shaded" />
          <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0" result="lit" />
          <feDropShadow in="lit" dx="0.35" dy="0.5" stdDeviation="0.6" floodColor={shade} floodOpacity={light ? 0.45 : 0.55} />
        </filter>
        {/* 도장이 눌린 안쪽 면 */}
        <filter id={`inset${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feComponentTransfer in="SourceAlpha">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="1.8" />
          <feOffset dx="-1.3" dy="-1.8" result="sh" />
          <feFlood floodColor="#1d120e" floodOpacity={light ? 0.4 : 0.5} />
          <feComposite in2="sh" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="innerShadow" />
          <feComponentTransfer in="SourceAlpha" result="inv">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur in="inv" stdDeviation="1.2" />
          <feOffset dx="1" dy="1.3" result="hl" />
          <feFlood floodColor="#fff" floodOpacity=".28" />
          <feComposite in2="hl" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="innerLight" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="innerShadow" />
            <feMergeNode in="innerLight" />
          </feMerge>
        </filter>
        <filter id={`grain${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .2 0" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
        <filter id={`drop${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.6" floodColor="#2b1d17" floodOpacity=".3" />
          <feDropShadow dx="0" dy="1" stdDeviation="0.9" floodColor="#2b1d17" floodOpacity=".25" />
        </filter>
        <radialGradient id={`tone${id}`} cx="38%" cy="32%" r="82%">
          <stop offset="0" stopColor="#fff" stopOpacity=".12" />
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".28" />
        </radialGradient>
        <clipPath id={`clip${id}`}>
          <path d={outer} />
        </clipPath>
      </defs>

      {/* 왁스 덩어리 */}
      <g filter={`url(#drop${id})`}>
        <path d={outer} fill={color} filter={`url(#gloss${id})`} />
      </g>
      <path d={outer} fill={`url(#tone${id})`} />
      <rect width="120" height="120" clipPath={`url(#clip${id})`} filter={`url(#grain${id})`} fill="#000" />

      {/* 도장이 눌린 안쪽 원 */}
      <circle cx="60" cy="60" r="35.5" fill={color} filter={`url(#inset${id})`} />

      {/* 양각 테두리 */}
      <g fill="none" stroke={color} filter={`url(#emb${id})`}>
        <circle cx="60" cy="60" r="32.6" strokeWidth="1.1" />
        <circle cx="60" cy="60" r="30.2" strokeWidth="0.45" />
      </g>

      {/* 양각 문양 — 레이어를 쌓아 깊이감 */}
      <g transform={`translate(60 60) scale(${EMBLEM_SCALE[emblem]}) translate(-60 -60)`}>
        {layers.map((l, i) => (
          <g key={i} fill={color} filter={`url(#emb${id})`}>
            {l}
          </g>
        ))}
      </g>
    </svg>
  )
}
