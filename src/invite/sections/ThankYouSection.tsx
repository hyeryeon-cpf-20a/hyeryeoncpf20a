import { useMemo } from 'react'
import type { SectionOf } from '../../lib/types'
import { formatEnDate, parseWedding } from '../../lib/date'
import { useInvite } from '../context'
import { Reveal } from '../ui/Reveal'
import { Body, SectionShell } from '../SectionShell'
import { inviteUrl, shareKakao, shareNative } from '../../lib/share'
import { copyText } from '../../lib/util'
import { imageSrc } from '../../lib/image'

function ShareBar() {
  const { content, flags, toast } = useInvite()
  const url = inviteUrl(flags.slug)
  const hasKakao = !!content.share.kakaoJsKey?.trim()
  return (
    <div className="mt-14 flex flex-wrap justify-center gap-2 text-[0.78rem]">
      {hasKakao && (
        <button
          type="button"
          className="tap btn-ghost inline-flex items-center gap-1.5"
          onClick={() => shareKakao(content, url).catch(() => toast('카카오톡 공유를 열 수 없어요'))}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: '#F2C94C' }} /> 카카오톡 공유
        </button>
      )}
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button type="button" className="tap btn-ghost" onClick={() => shareNative(content.share.title, content.share.description, url)}>
          공유하기
        </button>
      )}
      <button type="button" className="tap btn-ghost" onClick={async () => toast((await copyText(url)) ? '청첩장 링크가 복사되었어요' : '복사에 실패했어요')}>
        링크 복사
      </button>
    </div>
  )
}

function Petals({ kind }: { kind: 'petals' | 'light' }) {
  const items = useMemo(
    () =>
      Array.from({ length: kind === 'petals' ? 9 : 6 }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        delay: (i * 1.7) % 9,
        dur: 11 + ((i * 3) % 7),
        size: 7 + ((i * 5) % 6),
        drift: ((i % 2 ? 1 : -1) * (20 + ((i * 13) % 40))) + 'px',
        spin: 180 + ((i * 47) % 260) + 'deg',
      })),
    [kind],
  )
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((p, i) =>
        kind === 'petals' ? (
          <span
            key={i}
            className="absolute top-0"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.25,
              borderRadius: '80% 0 80% 0',
              background: i % 3 === 0 ? 'color-mix(in srgb, var(--c-wax) 35%, white)' : 'color-mix(in srgb, var(--c-wax) 18%, white)',
              animation: `petal-fall ${p.dur}s linear ${p.delay}s infinite`,
              ['--drift' as string]: p.drift,
              ['--spin' as string]: p.spin,
              opacity: 0,
              willChange: 'transform, opacity',
            }}
          />
        ) : (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${(i * 23 + 10) % 90}%`,
              width: p.size * 12,
              height: p.size * 12,
              background: 'radial-gradient(circle, rgba(255,255,255,.9), rgba(255,255,255,0) 70%)',
              animation: `light-drift ${p.dur}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ),
      )}
    </div>
  )
}

export function ThankYouSection({ section, selected }: { section: SectionOf<'thankyou'>; selected?: boolean }) {
  const { content, motionOn } = useInvite()
  const s = section.settings
  const p = parseWedding(content.wedding)
  const src = imageSrc(s.bgPhoto)
  // 배경 사진: 흐림·진하기 조절, 위아래는 바탕색으로 자연스럽게
  const backdrop = src ? (
    <>
      <img
        src={src}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          objectPosition: `${s.bgPhoto?.focusX ?? 50}% ${s.bgPhoto?.focusY ?? 50}%`,
          filter: s.bgBlur ? `blur(${s.bgBlur}px)` : undefined,
          transform: `scale(${1 + Math.min(0.25, s.bgBlur / 80)})`,
          opacity: s.bgOpacity,
        }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, var(--c-bg) 0%, transparent 18%, transparent 82%, var(--c-bg) 100%)' }} />
    </>
  ) : undefined
  return (
    <SectionShell section={section} selected={selected} className="overflow-hidden" backdrop={backdrop}>
      {motionOn && s.effect !== 'none' && <Petals kind={s.effect} />}
      <div className="relative">
        <Reveal variant="fade">
          <p className="font-script leading-none" style={{ fontSize: 'calc(3.6rem * var(--title-scale,1))' }}>
            {s.script}
          </p>
        </Reveal>
        <Reveal delay={0.35}>
          <Body className="mt-9" style={{ fontSize: 'calc(0.94rem * var(--body-scale,1))', lineHeight: 2 }}>
            {s.message}
          </Body>
        </Reveal>
        {(s.showNames || s.showDate) && (
          <Reveal delay={0.6} className="mt-16">
            <div className="mx-auto mb-5 h-px w-8" style={{ background: 'var(--c-accent)', opacity: 0.6 }} />
            {s.showNames && (
              <p className="text-[0.82rem] tracking-[0.12em]">
                {content.couple.groomKo} <span style={{ color: 'var(--c-accent)' }}>&</span> {content.couple.brideKo}
              </p>
            )}
            {s.showDate && (
              <p className="font-serif-en mt-1.5 text-[0.72rem] tracking-[0.3em]" style={{ color: 'var(--c-muted)' }}>
                {formatEnDate(p)}
              </p>
            )}
          </Reveal>
        )}
        <ShareBar />
      </div>
      <div style={{ height: 'var(--safe-bottom)' }} />
    </SectionShell>
  )
}
