import { useId, useMemo } from 'react'
import type { EnvelopeSettings } from '../lib/types'

/** 가장자리가 살짝 불규칙한 실링왁스 */
function blobPath(cx: number, cy: number, r: number, seed = 7) {
  const pts: [number, number][] = []
  const n = 22
  let s = seed
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = r * (0.94 + rnd() * 0.08)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  for (let i = 0; i < n; i++) {
    const p1 = pts[(i + 1) % n]
    const p0 = pts[i]
    const mx = (p0[0] + p1[0]) / 2
    const my = (p0[1] + p1[1]) / 2
    d += ` Q ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`
  }
  return d + ' Z'
}

export function WaxSeal({ settings, size = 76 }: { settings: Pick<EnvelopeSettings, 'waxColor' | 'waxEmblem' | 'waxInitials'>; size?: number }) {
  const id = useId().replace(/:/g, '')
  const outer = useMemo(() => blobPath(50, 50, 47, 11), [])
  const color = settings.waxColor
  // 예전에 저장된 다른 문양 값은 이니셜로 표시
  const emblem = (['initials', 'heart', 'flower'] as const).includes(settings.waxEmblem) ? settings.waxEmblem : 'initials'
  const initials = (settings.waxInitials || '').slice(0, 7)
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id={`g${id}`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".28" />
        </radialGradient>
        <radialGradient id={`i${id}`} cx="60%" cy="66%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </radialGradient>
        <filter id={`s${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="2.2" floodColor="#3a2a22" floodOpacity=".28" />
        </filter>
      </defs>
      <g filter={`url(#s${id})`}>
        <path d={outer} fill={color} />
        <path d={outer} fill={`url(#g${id})`} />
      </g>
      {/* 눌린 안쪽 원 */}
      <circle cx="50" cy="50" r="33" fill={color} />
      <circle cx="50" cy="50" r="33" fill={`url(#i${id})`} />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#000" strokeOpacity=".16" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="31.5" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth=".8" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth=".6" strokeDasharray="1.2 2.2" />
      <g fill="none" stroke="#000" strokeOpacity=".22" strokeLinecap="round" strokeLinejoin="round">
        {emblem === 'heart' && (
          <path
            d="M50 64 C 38 55, 34 49, 34 43 C 34 37.5, 38.5 34, 43 34 C 46.5 34, 49 36, 50 39 C 51 36, 53.5 34, 57 34 C 61.5 34, 66 37.5, 66 43 C 66 49, 62 55, 50 64 Z"
            strokeWidth="1.6"
          />
        )}
        {emblem === 'flower' && (
          <g strokeWidth="1.3">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="50" cy="39" rx="5.6" ry="9.5" transform={`rotate(${a} 50 50)`} />
            ))}
            <circle cx="50" cy="50" r="3.4" />
          </g>
        )}
      </g>
      {emblem === 'heart' && (
        <path
          d="M50 63 C 38.5 54.5, 35 48.8, 35 43.2 C 35 38.2, 39 35, 43 35 C 46.4 35, 48.8 37, 50 40 C 51.2 37, 53.6 35, 57 35 C 61 35, 65 38.2, 65 43.2 C 65 48.8, 61.5 54.5, 50 63 Z"
          fill="none"
          stroke="#fff"
          strokeOpacity=".3"
          strokeWidth=".9"
          transform="translate(-.4 -.5)"
        />
      )}
      {emblem === 'flower' && (
        <g fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth=".8" transform="translate(-.4 -.5)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="50" cy="39" rx="5.6" ry="9.5" transform={`rotate(${a} 50 50)`} />
          ))}
        </g>
      )}
      {emblem === 'initials' && (
        <>
          <text
            x="50"
            y="51"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--f-serif)"
            fontStyle="italic"
            fontSize={initials.length > 4 ? 15 : 22}
            fill="#000"
            fillOpacity=".24"
          >
            {initials}
          </text>
          <text
            x="49.5"
            y="50.4"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--f-serif)"
            fontStyle="italic"
            fontSize={initials.length > 4 ? 15 : 22}
            fill="#fff"
            fillOpacity=".26"
          >
            {initials}
          </text>
        </>
      )}
    </svg>
  )
}
