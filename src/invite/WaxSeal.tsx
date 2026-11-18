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

/** 가리비 조개: 둥근 몸통(아래 경첩에서 퍼지는 골 + 물결 가장자리)과 경첩 양옆의 작은 귀 */
function shellPaths() {
  const hx = 50
  const hy = 66
  const Rc = 17.5 // 몸통은 경첩을 아래 끝점으로 하는 원에 가깝게
  const n = 13
  const lim = (80 * Math.PI) / 180
  const len = (a: number) => 2 * Rc * Math.cos(a) * (1 - 0.04 * Math.cos(a))
  const at = (a: number, r: number) => [hx + Math.sin(a) * r, hy - Math.cos(a) * r] as const
  const f = (p: readonly [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  const bounds = Array.from({ length: n + 1 }, (_, i) => -lim + ((2 * lim) * i) / n)
  let outline = `M ${f(at(bounds[0], len(bounds[0])))}`
  const ridges: string[] = []
  for (let i = 0; i < n; i++) {
    const m = (bounds[i] + bounds[i + 1]) / 2
    outline += ` Q ${f(at(m, len(m) + 2.6))} ${f(at(bounds[i + 1], len(bounds[i + 1])))}`
    ridges.push(`M ${f(at(m, 5))} Q ${f(at(m * 0.96, len(m) * 0.55))} ${f(at(m, len(m) + 0.6))}`)
  }
  outline += ` Q ${hx} ${hy + 2} ${f(at(bounds[0], len(bounds[0])))} Z`
  const grooves = bounds.slice(1, -1).map((a) => `M ${f(at(a, 3))} Q ${f(at(a * 0.95, len(a) * 0.55))} ${f(at(a, len(a)))}`)
  // 경첩 양옆의 작은 귀
  const ears = `M ${hx - 12.5} ${hy - 1.5} L ${hx - 5} ${hy - 8} L ${hx + 5} ${hy - 8} L ${hx + 12.5} ${hy - 1.5} Q ${hx + 12} ${hy + 2.6} ${hx + 8} ${hy + 2.6} L ${hx - 8} ${hy + 2.6} Q ${hx - 12} ${hy + 2.6} ${hx - 12.5} ${hy - 1.5} Z`
  const earLines = [-1, 1].flatMap((sg) => [0.35, 0.65].map((t) => `M ${hx + sg * 3} ${hy + 1.5} L ${hx + sg * (6 + 7 * t)} ${hy - 7 + 5.5 * t}`))
  return { outline, grooves, ridges, ears, earLines }
}

function isLight(hex: string) {
  const v = (hex || '').replace('#', '')
  if (v.length < 6) return false
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 200
}

export function WaxSeal({ settings, size = 76 }: { settings: Pick<EnvelopeSettings, 'waxColor' | 'waxEmblem' | 'waxInitials'>; size?: number }) {
  const id = useId().replace(/:/g, '')
  const outer = useMemo(() => blobPath(50, 50, 47, 11), [])
  const color = settings.waxColor
  // 예전에 저장된 다른 문양 값은 이니셜로 표시
  const emblem = (['initials', 'heart', 'flower', 'shell'] as const).includes(settings.waxEmblem) ? settings.waxEmblem : 'initials'
  const shell = useMemo(() => shellPaths(), [])
  const pearly = isLight(color)
  const faceR = emblem === 'shell' ? 37 : 33
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
        <linearGradient id={`p${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE9F1" stopOpacity=".55" />
          <stop offset=".35" stopColor="#FFFFFF" stopOpacity=".2" />
          <stop offset=".6" stopColor="#E3EEFA" stopOpacity=".5" />
          <stop offset="1" stopColor="#F4EBDD" stopOpacity=".45" />
        </linearGradient>
        <linearGradient id={`h${id}`} x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".45" />
          <stop offset=".55" stopColor="#fff" stopOpacity=".08" />
          <stop offset="1" stopColor="#000" stopOpacity=".1" />
        </linearGradient>
        <filter id={`b${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation=".7" />
        </filter>
        <filter id={`s${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="2.2" floodColor="#3a2a22" floodOpacity=".28" />
        </filter>
      </defs>
      <g filter={`url(#s${id})`}>
        <path d={outer} fill={color} />
        <path d={outer} fill={`url(#g${id})`} />
        {pearly && <path d={outer} fill={`url(#p${id})`} />}
      </g>
      {/* 눌린 안쪽 원 */}
      <circle cx="50" cy="50" r={faceR} fill={color} />
      <circle cx="50" cy="50" r={faceR} fill={`url(#i${id})`} />
      {pearly && <circle cx="50" cy="50" r={faceR} fill={`url(#p${id})`} opacity=".7" />}
      <circle cx="50" cy="50" r={faceR} fill="none" stroke="#000" strokeOpacity={pearly ? 0.1 : 0.16} strokeWidth="1.2" />
      <circle cx="50" cy="50" r={faceR - 1.5} fill="none" stroke="#fff" strokeOpacity={pearly ? 0.5 : 0.18} strokeWidth=".8" />
      {emblem !== 'shell' && <circle cx="50" cy="50" r="27" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth=".6" strokeDasharray="1.2 2.2" />}
      {emblem === 'shell' && (
        <g transform="translate(50 50) rotate(-12) scale(1.3) translate(-50 -48.5)" strokeLinecap="round" strokeLinejoin="round">
          {/* 그림자 (오른쪽 아래) */}
          <g transform="translate(.9 1.1)" fill="#000" fillOpacity={pearly ? 0.14 : 0.22} filter={`url(#b${id})`}>
            <path d={shell.outline} />
            <path d={shell.ears} />
          </g>
          {/* 볼록 솟은 조개 */}
          <path d={shell.ears} fill={color} />
          <path d={shell.ears} fill={`url(#h${id})`} />
          <path d={shell.ears} fill="none" stroke="#000" strokeOpacity={pearly ? 0.14 : 0.22} strokeWidth=".8" />
          <g stroke="#000" strokeOpacity=".14" strokeWidth=".6">
            {shell.earLines.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <path d={shell.outline} fill={color} />
          <path d={shell.outline} fill={`url(#h${id})`} />
          {pearly && <path d={shell.outline} fill={`url(#p${id})`} opacity=".6" />}
          {/* 골: 어두운 홈 + 밝은 반대편 벽 */}
          <g fill="none" stroke="#000" strokeOpacity={pearly ? 0.2 : 0.3} strokeWidth="1.6" filter={`url(#b${id})`}>
            {shell.grooves.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g fill="none" stroke="#fff" strokeOpacity={pearly ? 0.75 : 0.32} strokeWidth=".7" transform="translate(.7 .2)">
            {shell.grooves.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          {/* 골 사이 볼록한 줄의 하이라이트 */}
          <g fill="none" stroke="#fff" strokeOpacity={pearly ? 0.6 : 0.22} strokeWidth="1.1" transform="translate(-.4 -.3)">
            {shell.ridges.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          {/* 가장자리 테두리 */}
          <path d={shell.outline} fill="none" stroke="#000" strokeOpacity={pearly ? 0.14 : 0.22} strokeWidth=".9" />
          <path d={shell.outline} fill="none" stroke="#fff" strokeOpacity={pearly ? 0.8 : 0.3} strokeWidth=".7" transform="translate(-.5 -.6)" />
        </g>
      )}
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
