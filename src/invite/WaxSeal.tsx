import { useId, useMemo } from 'react'
import type { EnvelopeSettings } from '../lib/types'

/** 녹아 퍼진 듯한 불규칙한 왁스 가장자리 (저주파 굴곡 + 잔물결) */
function puddlePath(cx: number, cy: number, r: number, seed: number) {
  let s = seed
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const n = 40
  const ph1 = rnd() * Math.PI * 2
  const ph2 = rnd() * Math.PI * 2
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = r * (1 + 0.018 * Math.sin(a * 3 + ph1) + 0.012 * Math.sin(a * 7 + ph2) + (rnd() - 0.5) * 0.012)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  let d = ''
  for (let i = 0; i < n; i++) {
    const p0 = pts[i]
    const p1 = pts[(i + 1) % n]
    const mx = (p0[0] + p1[0]) / 2
    const my = (p0[1] + p1[1]) / 2
    d += i === 0 ? `M ${mx.toFixed(2)} ${my.toFixed(2)}` : ` Q ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`
  }
  const p0 = pts[0]
  const m1 = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]
  return d + ` Q ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} ${m1[0].toFixed(2)} ${m1[1].toFixed(2)} Z`
}

/** 구슬 장식 테두리 — 클래식 인장 */
function Beads() {
  const dots = []
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2
    dots.push(<circle key={i} cx={60 + Math.cos(a) * 30.6} cy={60 + Math.sin(a) * 30.6} r={0.95} />)
  }
  return <g>{dots}</g>
}

export function WaxSeal({ settings, size = 76 }: { settings: Pick<EnvelopeSettings, 'waxColor' | 'waxEmblem' | 'waxInitials'>; size?: number }) {
  const id = useId().replace(/[:«»]/g, '')
  const outer = useMemo(() => puddlePath(60, 60, 47, 17), [])
  const color = settings.waxColor
  const emblem = settings.waxEmblem
  const initials = (settings.waxInitials || '').trim().slice(0, 7)
  const compact = initials.replace(/\s+/g, '')
  const fs = compact.length <= 2 ? 22 : compact.length <= 3 ? 17 : 13

  const emblemShape =
    emblem === 'heart' ? (
      <path d="M60 74 C 47 64.5, 43 58, 43 51.5 C 43 45.8, 47.6 42, 52.2 42 C 55.8 42, 58.6 44, 60 47.2 C 61.4 44, 64.2 42, 67.8 42 C 72.4 42, 77 45.8, 77 51.5 C 77 58, 73 64.5, 60 74 Z" />
    ) : emblem === 'flower' ? (
      <g>
        {[0, 72, 144, 216, 288].map((a) => (
          <path key={a} d="M60 58.5 C 55.5 52, 55.6 45.5, 60 41.5 C 64.4 45.5, 64.5 52, 60 58.5 Z" transform={`rotate(${a} 60 60)`} />
        ))}
        <circle cx="60" cy="60" r="3" />
      </g>
    ) : (
      <text
        x="60"
        y="61.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--f-serif), 'Cormorant Garamond', serif"
        fontStyle="italic"
        fontWeight={500}
        fontSize={fs}
        letterSpacing={compact.length > 3 ? 0.2 : 0.6}
      >
        {initials}
      </text>
    )

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {/* 광택 있는 왁스 볼륨: 알파를 높이맵으로 써서 스펙큘러 조명 */}
        <filter id={`gloss${id}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="h" />
          <feSpecularLighting in="h" surfaceScale="5" specularConstant="0.75" specularExponent="28" lightingColor="#fff" result="spec">
            <fePointLight x="20" y="0" z="90" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feDiffuseLighting in="h" surfaceScale="4" diffuseConstant="1" lightingColor="#fff" result="diff">
            <feDistantLight azimuth="235" elevation="48" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1="1.08" k2="0" k3="0" k4="0" result="shaded" />
          <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0" />
        </filter>
        {/* 각인(양각) — 날카로운 하이라이트 */}
        <filter id={`emb${id}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.7" result="h" />
          <feSpecularLighting in="h" surfaceScale="2.4" specularConstant="0.9" specularExponent="18" lightingColor="#fff" result="spec">
            <fePointLight x="20" y="0" z="70" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feDiffuseLighting in="h" surfaceScale="2.4" diffuseConstant="1" lightingColor="#fff" result="diff">
            <feDistantLight azimuth="235" elevation="40" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1="1.1" k2="0" k3="0" k4="0" result="shaded" />
          <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.6" k4="0" result="lit" />
          <feDropShadow dx="0.4" dy="0.6" stdDeviation="0.45" floodColor="#000" floodOpacity=".18" />
        </filter>
        {/* 눌린 안쪽 면 — 내부 그림자 */}
        <filter id={`inset${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feComponentTransfer in="SourceAlpha">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="1.6" />
          <feOffset dx="-1.2" dy="-1.6" result="sh" />
          <feFlood floodColor="#000" floodOpacity=".45" />
          <feComposite in2="sh" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="innerShadow" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="innerShadow" />
          </feMerge>
        </filter>
        {/* 왁스 미세 결 */}
        <filter id={`grain${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
        <filter id={`drop${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="3.2" floodColor="#2b1d17" floodOpacity=".32" />
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.8" floodColor="#2b1d17" floodOpacity=".25" />
        </filter>
        <radialGradient id={`tone${id}`} cx="40%" cy="34%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity=".10" />
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".30" />
        </radialGradient>
        <clipPath id={`clip${id}`}>
          <path d={outer} />
        </clipPath>
      </defs>

      {/* 그림자 + 왁스 덩어리 */}
      <g filter={`url(#drop${id})`}>
        <path d={outer} fill={color} filter={`url(#gloss${id})`} />
      </g>
      <path d={outer} fill={`url(#tone${id})`} />
      <rect x="0" y="0" width="120" height="120" clipPath={`url(#clip${id})`} filter={`url(#grain${id})`} fill="#000" opacity=".9" />

      {/* 도장이 눌린 안쪽 원 */}
      <circle cx="60" cy="60" r="36.5" fill={color} filter={`url(#inset${id})`} />
      <circle cx="60" cy="60" r="36.5" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth=".7" transform="translate(.5 .6)" />
      <circle cx="60" cy="60" r="36.5" fill="none" stroke="#000" strokeOpacity=".18" strokeWidth=".6" />

      {/* 양각 문양 */}
      <g fill={color} filter={`url(#emb${id})`}>
        <circle cx="60" cy="60" r="33.4" fill="none" stroke={color} strokeWidth="0.8" />
        <circle cx="60" cy="60" r="27.8" fill="none" stroke={color} strokeWidth="0.55" />
        <Beads />
        {emblemShape}
      </g>
    </svg>
  )
}
