import type { SectionOf } from '../../lib/types'
import { calendarMatrix, formatKoDate, formatKoTime, monthNameEn, parseWedding } from '../../lib/date'
import { useInvite } from '../context'
import { Reveal } from '../ui/Reveal'
import { SectionShell } from '../SectionShell'

const DAYS_SUN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAYS_MON = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const KO_SUN = ['일', '월', '화', '수', '목', '금', '토']
const KO_MON = ['월', '화', '수', '목', '금', '토', '일']

function Mark({ style, color }: { style: SectionOf<'calendar'>['settings']['heartStyle']; color: string }) {
  if (style === 'circle') return <span className="absolute inset-0 m-auto h-9 w-9 rounded-full" style={{ background: color, opacity: 0.9 }} />
  if (style === 'ring') return <span className="absolute inset-0 m-auto h-9 w-9 rounded-full" style={{ border: `1px solid ${color}` }} />
  return (
    <svg className="absolute inset-0 m-auto" width="38" height="36" viewBox="0 0 24 22" aria-hidden>
      <path
        d="M12 20.5C6 16.3 2.5 12.9 2.5 8.6 2.5 5.6 4.8 3.3 7.6 3.3c1.8 0 3.4.9 4.4 2.4 1-1.5 2.6-2.4 4.4-2.4 2.8 0 5.1 2.3 5.1 5.3 0 4.3-3.5 7.7-9.5 11.9z"
        fill={style === 'heart' ? color : 'none'}
        fillOpacity={style === 'heart' ? 0.88 : 0}
        stroke={color}
        strokeWidth={style === 'heart' ? 0 : 1}
      />
    </svg>
  )
}

export function CalendarSection({ section, selected }: { section: SectionOf<'calendar'>; selected?: boolean }) {
  const { content } = useInvite()
  const s = section.settings
  const p = parseWedding(content.wedding)
  const rows = calendarMatrix(p.y, p.m, s.weekStart)
  const heads = s.showWeekNumbersInKorean ? (s.weekStart === 'sun' ? KO_SUN : KO_MON) : s.weekStart === 'sun' ? DAYS_SUN : DAYS_MON
  const sunIdx = s.weekStart === 'sun' ? 0 : 6
  const filled = s.heartStyle === 'heart' || s.heartStyle === 'circle'
  const venue = content.sections.find((x) => x.type === 'location') as SectionOf<'location'> | undefined

  return (
    <SectionShell section={section} selected={selected}>
      <Reveal>
        <p className="eyebrow">{s.eyebrow}</p>
        {s.title && <h2 className="mt-3 text-[1.2rem] font-normal">{s.title}</h2>}
      </Reveal>

      <Reveal delay={0.1} className="mt-8">
        <p className="font-serif-en text-[3.4rem] font-light leading-none" style={{ fontSize: 'calc(3.4rem * var(--title-scale,1))' }}>
          {String(p.m).padStart(2, '0')}
        </p>
        <p className="font-serif-en mt-2 text-[0.8rem] tracking-[0.42em]" style={{ color: 'var(--c-muted)' }}>
          {monthNameEn(p.m)} {p.y}
        </p>
      </Reveal>

      <Reveal delay={0.2} className="mx-auto mt-9 w-full max-w-[360px]">
        <div className="h-px w-full" style={{ background: 'var(--c-text)', opacity: 0.12 }} />
        <table className="mt-4 w-full table-fixed border-collapse text-center" aria-label={`${p.y}년 ${p.m}월 달력`}>
          <thead>
            <tr>
              {heads.map((d, i) => (
                <th
                  key={d}
                  scope="col"
                  className="font-serif-en pb-3 text-[0.66rem] font-normal tracking-[0.12em]"
                  style={{ color: i === sunIdx ? 'var(--c-wax)' : 'var(--c-muted)', opacity: i === sunIdx ? 0.75 : 1 }}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((d, ci) => {
                  const isDay = d === p.d
                  return (
                    <td key={ci} className="relative h-11 p-0">
                      {d && (
                        <span className="relative inline-flex h-11 w-full items-center justify-center">
                          {isDay && <Mark style={s.heartStyle} color={s.highlightColor} />}
                          <span
                            className="font-serif-en relative text-[0.98rem] tabular-nums"
                            style={{
                              color: isDay ? (filled ? '#fff' : s.highlightColor) : ci === sunIdx ? 'var(--c-wax)' : 'var(--c-text)',
                              opacity: isDay ? 1 : ci === sunIdx ? 0.55 : 0.42,
                              fontWeight: isDay ? 600 : 400,
                              fontSize: isDay && s.heartStyle.startsWith('heart') ? '0.86rem' : undefined,
                              transform: isDay && s.heartStyle.startsWith('heart') ? 'translateY(-1px)' : undefined,
                            }}
                          >
                            {d}
                          </span>
                          {isDay && <span className="sr-only">결혼식 날</span>}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 h-px w-full" style={{ background: 'var(--c-text)', opacity: 0.12 }} />
      </Reveal>

      <Reveal delay={0.3} className="mt-9 space-y-1.5">
        <p className="text-[1rem]">{formatKoDate(p)}</p>
        <p className="text-[0.92rem]" style={{ color: 'var(--c-muted)' }}>
          {s.timeText || formatKoTime(p)}
        </p>
        {venue && (
          <p className="pt-2 text-[0.92rem]">
            {venue.settings.venueName}
            {venue.settings.hallName ? ` ${venue.settings.hallName}` : ''}
          </p>
        )}
        {s.note && (
          <p className="whitespace-pre-line pt-3 text-[0.84rem]" style={{ color: 'var(--c-muted)' }}>
            {s.note}
          </p>
        )}
      </Reveal>
    </SectionShell>
  )
}
