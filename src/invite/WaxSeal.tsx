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

/** 가리비 조개: 아래 경첩에서 부채꼴로 퍼지는 골과 물결 모양 가장자리 */
function shellPaths() {
  const hx = 50
  const hy = 69
  const R = 31
  const n = 10
  const a0 = (-64 * Math.PI) / 180
  const a1 = (64 * Math.PI) / 180
  const at = (a: number, r: number) => [hx + Math.sin(a) * r, hy - Math.cos(a) * r] as const
  const f = (p: readonly [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  const bounds = Array.from({ length: n + 1 }, (_, i) => a0 + ((a1 - a0) * i) / n)
  // 가장자리 반지름: 가운데가 가장 높고 양옆으로 갈수록 살짝 낮게
  const rAt = (a: number) => R * (1 - 0.1 * Math.pow(a / a1, 2))
  let outline = `M ${f(at(a0, 5))} L ${f(at(a0, rAt(a0)))}`
  const ridges: string[] = []
  for (let i = 0; i < n; i++) {
    const m = (bounds[i] + bounds[i + 1]) / 2
    outline += ` Q ${f(at(m, rAt(m) * 1.13))} ${f(at(bounds[i + 1], rAt(bounds[i + 1])))}`
    ridges.push(`M ${f(at(m, 9))} Q ${f(at(m * 0.97, rAt(m) * 0.6))} ${f(at(m, rAt(m) * 0.98))}`)
  }
  outline += ` L ${f(at(a1, 5))} Z`
  const grooves = bounds.slice(1, -1).map((a) => `M ${f(at(a, 6))} Q ${f(at(a * 0.95, rAt(a) * 0.55))} ${f(at(a, rAt(a)))}`)
  // 경첩 양옆의 작은 귀
  const ears = `M ${hx - 8.5} ${hy + 1.5} L ${hx - 4} ${hy - 3} L ${hx + 4} ${hy - 3} L ${hx + 8.5} ${hy + 1.5} Q ${hx + 7} ${hy + 4.6} ${hx + 3.5} ${hy + 4.2} L ${hx - 3.5} ${hy + 4.2} Q ${hx - 7} ${hy + 4.6} ${hx - 8.5} ${hy + 1.5} Z`
  return { outline, grooves, ridges, ears }
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
        <g transform="translate(50 50) rotate(-14) scale(1.22) translate(-50 -47)" strokeLinecap="round" strokeLinejoin="round">
          {/* 그림자 (오른쪽 아래) */}
          <g transform="translate(.9 1.1)" fill="#000" fillOpacity={pearly ? 0.14 : 0.22} filter={`url(#b${id})`}>
            <path d={shell.outline} />
            <path d={shell.ears} />
          </g>
          {/* 볼록 솟은 조개 */}
          <path d={shell.ears} fill={color} />
          <path d={shell.ears} fill={`url(#h${id})`} />
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
          <path d={shell.ears} fill="none" stroke="#000" strokeOpacity={pearly ? 0.14 : 0.22} strokeWidth=".8" />
          <path d={`M ${50 - 5.5} ${69 - 3.5} L ${50 + 5.5} ${69 - 3.5}`} stroke="#000" strokeOpacity=".14" strokeWidth=".8" />
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
