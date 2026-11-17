import { memo, useEffect, useMemo, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import type { InvitationContent, RuntimeFlags, Section, SectionOf } from '../lib/types'
import { fontStack, loadFonts } from '../lib/fonts'
import { prefersReducedMotion, safeStorage } from '../lib/util'
import { InviteProvider } from './context'
import { Envelope } from './Envelope'
import { SideNav } from './SideNav'
import { MainSection } from './sections/MainSection'
import { StorySection } from './sections/StorySection'
import { CalendarSection } from './sections/CalendarSection'
import { GallerySection } from './sections/GallerySection'
import { LocationSection } from './sections/LocationSection'
import { GratitudeSection } from './sections/GratitudeSection'
import { GuestbookSection } from './sections/GuestbookSection'
import { PhotographerSection } from './sections/PhotographerSection'
import { ThankYouSection } from './sections/ThankYouSection'
import { TextSection } from './sections/TextSection'
import { GreetingSection } from './sections/GreetingSection'

export interface ViewOptions {
  selectedId?: string | null
  onSelect?: (id: string) => void
  skipEnvelope?: boolean
  envelopeKey?: number
}

function applyTheme(content: InvitationContent) {
  const r = document.documentElement
  const c = content.theme.colors
  r.style.setProperty('--c-bg', c.bg)
  r.style.setProperty('--c-bg2', c.bg2)
  r.style.setProperty('--c-text', c.text)
  r.style.setProperty('--c-accent', c.accent)
  r.style.setProperty('--c-sage', c.sage)
  r.style.setProperty('--c-wax', c.wax)
  r.style.setProperty('--c-muted', c.muted)
  r.style.setProperty('--f-script', fontStack(content.theme.fonts.script))
  r.style.setProperty('--f-serif', fontStack(content.theme.fonts.serif))
  r.style.setProperty('--f-sans', fontStack(content.theme.fonts.sans))
  r.style.fontSize = `${content.theme.baseFontSize || 15}px`
  document.body.style.letterSpacing = content.theme.letterSpacing ? `${content.theme.letterSpacing}em` : ''
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c.bg)
  loadFonts([content.theme.fonts.script, content.theme.fonts.serif, content.theme.fonts.sans])
}

function renderSection(s: Section, selected: boolean, ready: boolean) {
  switch (s.type) {
    case 'main':
      return <MainSection key={s.id} section={s} selected={selected} ready={ready} />
    case 'story':
      return <StorySection key={s.id} section={s} selected={selected} />
    case 'calendar':
      return <CalendarSection key={s.id} section={s} selected={selected} />
    case 'gallery':
      return <GallerySection key={s.id} section={s} selected={selected} />
    case 'location':
      return <LocationSection key={s.id} section={s} selected={selected} />
    case 'gratitude':
      return <GratitudeSection key={s.id} section={s} selected={selected} />
    case 'guestbook':
      return <GuestbookSection key={s.id} section={s} selected={selected} />
    case 'photographer':
      return <PhotographerSection key={s.id} section={s} selected={selected} />
    case 'thankyou':
      return <ThankYouSection key={s.id} section={s} selected={selected} />
    case 'text':
      return <TextSection key={s.id} section={s} selected={selected} />
    case 'greeting':
      return <GreetingSection key={s.id} section={s} selected={selected} />
    default:
      return null
  }
}

/** 섹션 단위로 메모 — 봉투가 열릴 때 메인 섹션만 다시 그려 버벅임을 줄임 */
const SectionNode = memo(function SectionNode({ s, selected, ready }: { s: Section; selected: boolean; ready: boolean }) {
  return renderSection(s, selected, ready)
})

export function InvitationView({ content, flags, options = {} }: { content: InvitationContent; flags: RuntimeFlags; options?: ViewOptions }) {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const fn = () => setReduced(mq.matches)
    mq.addEventListener?.('change', fn)
    return () => mq.removeEventListener?.('change', fn)
  }, [])

  useEffect(() => applyTheme(content), [content])

  const envelope = content.sections.find((s) => s.type === 'envelope' && !s.hidden) as SectionOf<'envelope'> | undefined
  const storeKey = `opened:${flags.slug}`
  const initiallyClosed = () => {
    if (!envelope || options.skipEnvelope) return false
    if (flags.preview || envelope.settings.showOnEveryVisit) return true
    return safeStorage().get(storeKey) !== '1'
  }
  const [envOpen, setEnvOpen] = useState(initiallyClosed)
  const [ready, setReady] = useState(!initiallyClosed())
  // 봉투 안에서 메인 화면이 올라오는 효과: 처음에는 아래로 내려가 있음
  const startOffset = () => (typeof window !== 'undefined' ? window.innerHeight * 0.42 : 300)
  const pageY = useMotionValue(envOpen ? startOffset() : 0)

  // 관리자 미리보기: 봉투 다시 보기 / 봉투 끄기
  useEffect(() => {
    if (!flags.preview) return
    const closed = initiallyClosed()
    setEnvOpen(closed)
    setReady(!closed)
    pageY.set(closed ? startOffset() : 0)
    if (closed) window.scrollTo(0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.envelopeKey, options.skipEnvelope, !!envelope])

  const visible = useMemo(() => content.sections.filter((s) => !s.hidden && s.type !== 'envelope'), [content.sections])

  return (
    <InviteProvider content={content} flags={flags} reducedMotion={reduced}>
      <div
        className="invite-root invite-scroller"
        onClickCapture={
          options.onSelect
            ? (e) => {
                const el = (e.target as HTMLElement).closest('[data-section-id]') as HTMLElement | null
                if (el?.dataset.sectionId) options.onSelect!(el.dataset.sectionId)
              }
            : undefined
        }
      >
        <main>
          {visible.map((s, i) =>
            i === 0 ? (
              // 봉투 안에서 올라오는 것은 첫 화면(메인)만 — 움직이는 영역을 작게
              <motion.div key={s.id} style={{ y: pageY, willChange: envOpen ? 'transform' : undefined }}>
                <SectionNode s={s} selected={options.selectedId === s.id} ready={s.type === 'main' ? ready : true} />
              </motion.div>
            ) : (
              <SectionNode key={s.id} s={s} selected={options.selectedId === s.id} ready={s.type === 'main' ? ready : true} />
            ),
          )}
        </main>
        {visible.length === 0 && (
          <div className="flex min-h-[100svh] items-center justify-center text-[0.9rem]" style={{ color: 'var(--c-muted)' }}>
            표시할 섹션이 없어요.
          </div>
        )}
      </div>
      <SideNav sections={visible} visible={!envOpen} />
      {envelope && envOpen && (
        <Envelope
          key={options.envelopeKey ?? 0}
          section={envelope}
          pageY={pageY}
          onReveal={() => setReady(true)}
          onOpened={() => {
            safeStorage().set(storeKey, '1')
            pageY.set(0)
            setEnvOpen(false)
            setReady(true)
          }}
        />
      )}
    </InviteProvider>
  )
}

export type { RuntimeFlags }
