import { useEffect, useState } from 'react'
import type { PersonProfile, SectionOf } from '../../lib/types'
import { countdown, formatKoFull, parseWedding } from '../../lib/date'
import { useInvite } from '../context'
import { Img } from '../ui/Img'
import { Reveal } from '../ui/Reveal'
import { Body, SectionShell, SectionTitle } from '../SectionShell'

function Profile({ p, shape, delay }: { p: PersonProfile; shape: 'circle' | 'rounded'; delay: number }) {
  return (
    <Reveal delay={delay} className="flex min-w-0 flex-1 flex-col items-center text-center">
      <div className="w-[min(34vw,132px)]">
        <Img image={p.photo} aspect="1:1" radius={shape === 'circle' ? '50%' : 18} alt={`${p.role} ${p.nameKo}`} />
      </div>
      <p className="mt-4 text-[0.7rem] tracking-[0.2em]" style={{ color: 'var(--c-accent)' }}>
        {p.role}
      </p>
      <p className="mt-1 text-[1.08rem]" style={{ fontSize: 'calc(1.08rem * var(--title-scale,1))' }}>
        {p.nameKo}
      </p>
      {p.nameEn && (
        <p className="font-serif-en text-[0.82rem] italic tracking-[0.06em]" style={{ color: 'var(--c-muted)' }}>
          {p.nameEn}
        </p>
      )}
      {p.intro && (
        <Body className="mt-3" style={{ fontSize: 'calc(0.82rem * var(--body-scale,1))', lineHeight: 1.75 }}>
          {p.intro}
        </Body>
      )}
      {p.parents && (
        <p className="mt-3 text-[0.74rem]" style={{ color: 'var(--c-muted)' }}>
          {p.parents}
        </p>
      )}
      {p.phone && (
        <a href={`tel:${p.phone.replace(/[^0-9+]/g, '')}`} className="tap btn-ghost mt-3 inline-flex items-center gap-1 !py-1.5 !text-[0.74rem]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
          </svg>
          연락하기
        </a>
      )}
    </Reveal>
  )
}

function Unit({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-serif-en text-[2rem] font-light tabular-nums leading-none" style={{ fontSize: 'calc(2rem * var(--title-scale,1))' }}>
        {String(n).padStart(2, '0')}
      </span>
      <span className="mt-2 text-[0.62rem] tracking-[0.24em]" style={{ color: 'var(--c-muted)' }}>
        {label}
      </span>
    </div>
  )
}

export function StorySection({ section, selected }: { section: SectionOf<'story'>; selected?: boolean }) {
  const { content } = useInvite()
  const s = section.settings
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const c = countdown(content.wedding, now)
  const p = parseWedding(content.wedding)
  const people = s.order === 'bride-first' ? [s.bride, s.groom] : [s.groom, s.bride]
  const showDday = s.countdownMode === 'dday' || s.countdownMode === 'both'
  const showFull = s.countdownMode === 'full' || s.countdownMode === 'both'

  return (
    <SectionShell section={section} selected={selected}>
      {/* 상단: 소개 */}
      <div className="flex min-h-[calc(var(--app-h,100svh)*0.44)] flex-col justify-center">
        <Reveal>
          <SectionTitle eyebrow={s.eyebrow} title={s.title} />
        </Reveal>
        <div className="flex items-start justify-center gap-5">
          <Profile p={people[0]} shape={s.photoShape} delay={0.1} />
          <Profile p={people[1]} shape={s.photoShape} delay={0.25} />
        </div>
      </div>

      {s.showCountdown && (
        <>
          <div className="mx-auto my-12 h-10 w-px" style={{ background: 'var(--c-accent)', opacity: 0.5 }} />
          {/* 하단: 카운트다운 */}
          <div className="flex min-h-[calc(var(--app-h,100svh)*0.36)] flex-col items-center justify-center">
            <Reveal>
              <p className="eyebrow">{s.countdownEyebrow}</p>
              <p className="mt-3 text-[0.92rem]" style={{ color: 'var(--c-muted)' }}>
                {formatKoFull(p)}
              </p>
            </Reveal>
            {c.past && !c.today ? (
              <Reveal className="mt-8">
                <p className="font-script text-[2.6rem] leading-tight" style={{ fontSize: 'calc(2.6rem * var(--title-scale,1))' }}>
                  {s.afterText || 'Our Wedding Day'}
                </p>
              </Reveal>
            ) : (
              <>
                {showDday && (
                  <Reveal className="mt-8" delay={0.1}>
                    <p className="font-serif-en text-[3.2rem] font-light leading-none tracking-[0.06em]" style={{ fontSize: 'calc(3.2rem * var(--title-scale,1))' }}>
                      {c.dday > 0 ? `D-${c.dday}` : 'D-DAY'}
                    </p>
                  </Reveal>
                )}
                {showFull && !c.past && (
                  <Reveal className="mt-8 flex items-start justify-center gap-4" delay={0.2}>
                    <Unit n={c.days} label="DAYS" />
                    <span className="font-serif-en mt-1 text-[1.4rem] opacity-40">:</span>
                    <Unit n={c.hours} label="HOURS" />
                    <span className="font-serif-en mt-1 text-[1.4rem] opacity-40">:</span>
                    <Unit n={c.minutes} label="MINUTES" />
                  </Reveal>
                )}
                {c.past && c.today && (
                  <p className="font-script mt-6 text-[2rem]">{s.afterText || 'Our Wedding Day'}</p>
                )}
                {!c.past && s.countdownTitle && (
                  <Reveal delay={0.3}>
                    <p className="mt-7 text-[0.86rem]" style={{ color: 'var(--c-muted)' }}>
                      {s.countdownTitle} <span style={{ color: 'var(--c-wax)' }}>{c.dday > 0 ? `${c.dday}일` : '오늘'}</span>{' '}
                      {c.dday > 0 ? '남았습니다' : '입니다'}
                    </p>
                  </Reveal>
                )}
              </>
            )}
          </div>
        </>
      )}
    </SectionShell>
  )
}
