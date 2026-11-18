import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { submitRsvp } from '../lib/api'
import { errorMessage } from '../lib/util'
import { useInvite } from './context'

/** 팝업을 다시 여는 이벤트 (달력 페이지의 ‘참석 여부 전달하기’ 버튼 등) */
export const OPEN_RSVP_EVENT = 'open-rsvp'
export function openRsvp() {
  window.dispatchEvent(new Event(OPEN_RSVP_EVENT))
}

interface Saved {
  id: string
  token: string
  name: string
  side: 'groom' | 'bride' | null
  attending: boolean
  partySize: number
  meal: 'yes' | 'no' | 'undecided' | null
}

const store = {
  get(key: string): Saved | null {
    try {
      const v = window.localStorage.getItem(key)
      return v ? (JSON.parse(v) as Saved) : null
    } catch {
      return null
    }
  },
  set(key: string, v: Saved) {
    try {
      window.localStorage.setItem(key, JSON.stringify(v))
    } catch {
      /* 저장소를 쓸 수 없어도 회신은 서버에 저장됨 */
    }
  },
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="tap flex-1 rounded-full px-3 py-2.5 text-[0.86rem] transition-colors"
      style={{
        background: on ? 'var(--c-text)' : 'color-mix(in srgb, var(--c-text) 6%, transparent)',
        color: on ? 'var(--c-bg)' : 'var(--c-text)',
      }}
    >
      {children}
    </button>
  )
}

export function RsvpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { content, flags, toast } = useInvite()
  const r = content.rsvp
  const key = `rsvp:${flags.invitationId ?? flags.slug}`
  const [saved, setSaved] = useState<Saved | null>(null)
  const [name, setName] = useState('')
  const [side, setSide] = useState<'groom' | 'bride' | null>(null)
  const [attending, setAttending] = useState<boolean | null>(null)
  const [party, setParty] = useState(1)
  const [meal, setMeal] = useState<'yes' | 'no' | 'undecided' | null>(null)
  const [honey, setHoney] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<null | boolean>(null) // 보낸 결과(참석/불참)
  const nameRef = useRef<HTMLInputElement>(null)

  // 열릴 때마다 이전 회신 불러와 미리 채움
  useEffect(() => {
    if (!open) return
    const s = store.get(key)
    setSaved(s)
    setDone(null)
    if (s) {
      setName(s.name)
      setSide(s.side)
      setAttending(s.attending)
      setParty(Math.max(1, s.partySize || 1))
      setMeal(s.meal)
    }
  }, [open, key])

  // 열려 있는 동안 뒤 페이지 스크롤 잠금 + ESC 로 닫기
  useEffect(() => {
    if (!open) return
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  async function send() {
    if (flags.preview) return toast('미리보기에서는 회신이 저장되지 않아요')
    if (!name.trim()) {
      nameRef.current?.focus()
      return toast('이름을 입력해 주세요')
    }
    if (attending === null) return toast('참석 여부를 선택해 주세요')
    setBusy(true)
    try {
      const res = await submitRsvp({
        slug: flags.slug,
        name: name.trim(),
        side: r.askSide ? side : null,
        attending,
        partySize: attending ? (r.askPartySize ? party : 1) : 0,
        meal: attending && r.askMeal ? meal : null,
        id: saved?.id,
        token: saved?.token,
        honeypot: honey,
      })
      const s: Saved = { id: res.id, token: res.token, name: name.trim(), side, attending, partySize: attending ? party : 0, meal }
      store.set(key, s)
      setSaved(s)
      setDone(attending)
    } catch (e) {
      toast(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const prevLabel = saved ? `${saved.attending ? `참석${saved.partySize > 1 ? ` · ${saved.partySize}명` : ''}` : '불참'}` : ''

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center"
          style={{ background: 'rgba(40,34,30,.38)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="참석 여부 회신"
            className="relative w-full max-w-[430px] overflow-y-auto rounded-t-[22px] px-6 pt-7 sm:rounded-[22px]"
            style={{
              background: 'var(--c-bg)',
              color: 'var(--c-text)',
              maxHeight: 'calc(var(--app-h, 100svh) - 40px)',
              paddingBottom: 'calc(20px + var(--safe-bottom))',
            }}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={onClose} aria-label="닫기" className="tap absolute right-3 top-3 flex h-10 w-10 items-center justify-center" style={{ color: 'var(--c-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            {done === null ? (
              <div className="text-center">
                <p className="eyebrow">R.S.V.P</p>
                <h2 className="mt-3 text-[1.15rem] font-normal">{r.title}</h2>
                {r.description && (
                  <p className="mt-3 whitespace-pre-line text-[0.84rem] leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                    {r.description}
                  </p>
                )}
                {r.deadline && (
                  <p className="mt-2 text-[0.76rem]" style={{ color: 'var(--c-wax)' }}>
                    {r.deadline}
                  </p>
                )}
                {saved && (
                  <p className="mx-auto mt-4 rounded-full px-3 py-1.5 text-[0.76rem]" style={{ background: 'color-mix(in srgb, var(--c-accent) 14%, transparent)' }}>
                    이전에 <b className="font-medium">{prevLabel}</b>(으)로 회신하셨어요 · 다시 보내면 수정돼요
                  </p>
                )}

                <div className="mt-6 space-y-4 text-left">
                  <label className="block">
                    <span className="mb-1.5 block text-[0.76rem]" style={{ color: 'var(--c-muted)' }}>
                      성함
                    </span>
                    <input ref={nameRef} className="field" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="이름을 입력해 주세요" />
                  </label>

                  {r.askSide && (
                    <div>
                      <span className="mb-1.5 block text-[0.76rem]" style={{ color: 'var(--c-muted)' }}>
                        어느 쪽 하객이신가요?
                      </span>
                      <div className="flex gap-2">
                        <Chip on={side === 'groom'} onClick={() => setSide('groom')}>
                          신랑측
                        </Chip>
                        <Chip on={side === 'bride'} onClick={() => setSide('bride')}>
                          신부측
                        </Chip>
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="mb-1.5 block text-[0.76rem]" style={{ color: 'var(--c-muted)' }}>
                      참석 여부
                    </span>
                    <div className="flex gap-2">
                      <Chip on={attending === true} onClick={() => setAttending(true)}>
                        참석할게요
                      </Chip>
                      <Chip on={attending === false} onClick={() => setAttending(false)}>
                        어려워요
                      </Chip>
                    </div>
                  </div>

                  {attending && r.askPartySize && (
                    <div className="flex items-center justify-between">
                      <span className="text-[0.84rem]">
                        참석 인원 <span style={{ color: 'var(--c-muted)' }}>(본인 포함)</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <button type="button" aria-label="인원 줄이기" className="tap btn-ghost !h-9 !w-9 !p-0" onClick={() => setParty((n) => Math.max(1, n - 1))}>
                          −
                        </button>
                        <span className="font-serif-en w-6 text-center text-[1.1rem] tabular-nums">{party}</span>
                        <button type="button" aria-label="인원 늘리기" className="tap btn-ghost !h-9 !w-9 !p-0" onClick={() => setParty((n) => Math.min(10, n + 1))}>
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {attending && r.askMeal && (
                    <div>
                      <span className="mb-1.5 block text-[0.76rem]" style={{ color: 'var(--c-muted)' }}>
                        식사 여부
                      </span>
                      <div className="flex gap-2">
                        <Chip on={meal === 'yes'} onClick={() => setMeal('yes')}>
                          식사해요
                        </Chip>
                        <Chip on={meal === 'no'} onClick={() => setMeal('no')}>
                          안 해요
                        </Chip>
                        <Chip on={meal === 'undecided'} onClick={() => setMeal('undecided')}>
                          미정
                        </Chip>
                      </div>
                    </div>
                  )}

                  <input
                    tabIndex={-1}
                    aria-hidden="true"
                    autoComplete="off"
                    value={honey}
                    onChange={(e) => setHoney(e.target.value)}
                    style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                  />
                </div>

                <button type="button" className="tap btn-primary mt-6 w-full" disabled={busy} onClick={send}>
                  {busy ? '보내는 중…' : saved ? '회신 수정하기' : '회신 보내기'}
                </button>
                {flags.preview && (
                  <p className="mt-2 text-[0.72rem]" style={{ color: 'var(--c-wax)' }}>
                    미리보기에서는 회신이 저장되지 않아요.
                  </p>
                )}
                <button type="button" className="tap mt-4 w-full py-2 text-[0.8rem] underline underline-offset-4" style={{ color: 'var(--c-muted)' }} onClick={onClose}>
                  이미 회신했어요
                </button>
              </div>
            ) : (
              <motion.div className="py-6 text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <p className="font-script text-[2.4rem] leading-none">{done ? 'See you soon' : 'Thank you'}</p>
                <p className="mt-6 whitespace-pre-line text-[0.92rem] leading-[1.9]">{done ? r.attendMessage : r.declineMessage}</p>
                {done && saved && saved.partySize > 0 && (
                  <p className="mt-3 text-[0.78rem]" style={{ color: 'var(--c-muted)' }}>
                    {saved.name}님{saved.partySize > 1 ? ` 외 ${saved.partySize - 1}명` : ''} · 참석으로 전달되었어요
                  </p>
                )}
                <button type="button" className="tap btn-primary mt-8 w-full" onClick={onClose}>
                  닫기
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
