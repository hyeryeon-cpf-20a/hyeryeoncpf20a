import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GuestbookEntry, SectionOf } from '../../lib/types'
import { guestDeleteGuestbook, listGuestbook, submitGuestbook } from '../../lib/api'
import { isBackendConfigured } from '../../lib/supabase'
import { errorMessage } from '../../lib/util'
import { useInvite } from '../context'
import { Reveal } from '../ui/Reveal'
import { Body, SectionShell, SectionTitle } from '../SectionShell'

function fmt(d: string) {
  const t = new Date(d)
  return `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, '0')}.${String(t.getDate()).padStart(2, '0')}`
}

function EntryCard({ e, onDelete }: { e: GuestbookEntry; onDelete: (e: GuestbookEntry) => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="paper-cotton relative list-none rounded-[6px] px-5 pb-4 pt-5 text-left"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--c-bg) 55%, white)',
        boxShadow: '0 1px 2px rgba(81,74,67,.05), 0 10px 22px -16px rgba(81,74,67,.25)',
      }}
    >
      <p className="whitespace-pre-line text-[0.9rem] leading-[1.85]" style={{ fontSize: 'calc(0.9rem * var(--body-scale,1))' }}>
        {e.message}
      </p>
      <div className="mt-3 flex items-center justify-between text-[0.74rem]" style={{ color: 'var(--c-muted)' }}>
        <span>
          <span className="font-serif-en italic">from.</span> {e.author}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-serif-en tabular-nums">{fmt(e.created_at)}</span>
          <button type="button" className="tap -m-2 p-2 opacity-60" aria-label="삭제" onClick={() => onDelete(e)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </span>
      </div>
    </motion.li>
  )
}

export function GuestbookSection({ section, selected }: { section: SectionOf<'guestbook'>; selected?: boolean }) {
  const { flags, toast } = useInvite()
  const s = section.settings
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [shown, setShown] = useState(s.pageSize || 10)
  const [author, setAuthor] = useState('')
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [honey, setHoney] = useState('')
  const [sending, setSending] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [del, setDel] = useState<GuestbookEntry | null>(null)
  const [delPw, setDelPw] = useState('')
  const startedAt = useRef<number>(Date.now())

  const canWrite = isBackendConfigured && flags.guestbookEnabled && !flags.preview
  const canRead = isBackendConfigured && flags.guestbookPublic

  const load = useCallback(async () => {
    if (!canRead) return
    setLoading(true)
    setLoadError(null)
    try {
      setEntries(await listGuestbook(flags.slug, 200))
    } catch (e) {
      setLoadError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [canRead, flags.slug])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!canWrite || sending) return
    if (!author.trim() || !message.trim()) return toast('이름과 메시지를 입력해 주세요')
    if (password && (password.length < 4 || password.length > 32)) return toast('비밀번호는 4자 이상 입력해 주세요')
    setSending(true)
    try {
      const res = await submitGuestbook({
        slug: flags.slug,
        author: author.trim(),
        message: message.trim(),
        password,
        honeypot: honey,
        elapsedMs: Date.now() - startedAt.current,
      })
      if (res.public) {
        setEntries((prev) => [
          { id: res.id, author: author.trim(), message: message.trim(), created_at: new Date().toISOString(), has_password: !!password },
          ...prev,
        ])
      }
      setMessage('')
      setPassword('')
      setFormOpen(false)
      toast('따뜻한 마음 감사합니다')
    } catch (e) {
      toast(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  async function confirmDelete() {
    if (!del) return
    try {
      const r = await guestDeleteGuestbook(del.id, delPw)
      if (r === 'deleted') {
        setEntries((prev) => prev.filter((x) => x.id !== del.id))
        toast('삭제되었어요')
      } else toast('삭제 요청이 전달되었어요')
      setDel(null)
      setDelPw('')
    } catch (e) {
      toast(errorMessage(e))
    }
  }

  return (
    <SectionShell section={section} selected={selected}>
      <Reveal>
        <SectionTitle eyebrow={s.eyebrow} title={s.title} />
      </Reveal>
      {s.description && (
        <Reveal delay={0.05}>
          <Body className="-mt-4 mb-8" style={{ color: 'var(--c-muted)', fontSize: 'calc(0.86rem * var(--body-scale,1))' }}>
            {s.description}
          </Body>
        </Reveal>
      )}

      {!isBackendConfigured ? (
        <p className="soft-card px-5 py-4 text-[0.82rem]" style={{ color: 'var(--c-muted)' }}>
          서버(Supabase)가 아직 연결되지 않아 축하글을 저장할 수 없어요.
        </p>
      ) : !flags.guestbookEnabled ? (
        <p className="soft-card px-5 py-4 text-[0.84rem]" style={{ color: 'var(--c-muted)' }}>
          {s.disabledText}
        </p>
      ) : (
        <Reveal delay={0.1}>
          {!formOpen ? (
            <button type="button" className="tap btn-primary w-full" onClick={() => { setFormOpen(true); startedAt.current = Date.now() }}>
              축하글 남기기
            </button>
          ) : (
            <form onSubmit={submit} className="soft-card space-y-3 p-4 text-left" noValidate>
              {flags.preview && (
                <p className="text-[0.76rem]" style={{ color: 'var(--c-wax)' }}>
                  미리보기에서는 작성되지 않아요. 하객 페이지에서 확인해 주세요.
                </p>
              )}
              <label className="block">
                <span className="mb-1.5 block text-[0.76rem]" style={{ color: 'var(--c-muted)' }}>
                  이름
                </span>
                <input className="field" maxLength={20} value={author} onChange={(e) => setAuthor(e.target.value)} autoComplete="name" required />
              </label>
              <label className="block">
                <span className="mb-1.5 flex justify-between text-[0.76rem]" style={{ color: 'var(--c-muted)' }}>
                  <span>축하 메시지</span>
                  <span className="tabular-nums">{message.length}/500</span>
                </span>
                <textarea
                  className="field min-h-[120px] resize-none leading-relaxed"
                  maxLength={500}
                  placeholder={s.placeholder}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[0.76rem]" style={{ color: 'var(--c-muted)' }}>
                  비밀번호 (선택 · 나중에 직접 삭제할 때 사용)
                </span>
                <input
                  className="field"
                  type="password"
                  minLength={4}
                  maxLength={32}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              {/* 스팸 방지용 숨김 필드 */}
              <input
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
                name="website"
                value={honey}
                onChange={(e) => setHoney(e.target.value)}
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />
              <div className="flex gap-2 pt-1">
                <button type="button" className="tap btn-ghost flex-1" onClick={() => setFormOpen(false)}>
                  취소
                </button>
                <button type="submit" className="tap btn-primary flex-[2]" disabled={sending || !canWrite}>
                  {sending ? '보내는 중…' : '남기기'}
                </button>
              </div>
            </form>
          )}
        </Reveal>
      )}

      {canRead && (
        <div className="mt-8">
          {loading && entries.length === 0 && (
            <p className="text-[0.8rem]" style={{ color: 'var(--c-muted)' }}>
              불러오는 중…
            </p>
          )}
          {loadError && (
            <button type="button" className="text-[0.8rem] underline" style={{ color: 'var(--c-muted)' }} onClick={load}>
              축하글을 불러오지 못했어요. 다시 시도
            </button>
          )}
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {entries.slice(0, shown).map((e) => (
                <EntryCard key={e.id} e={e} onDelete={(x) => { setDel(x); setDelPw('') }} />
              ))}
            </AnimatePresence>
          </ul>
          {entries.length > shown && (
            <button type="button" className="tap btn-ghost mt-6" onClick={() => setShown((n) => n + (s.pageSize || 10))}>
              더보기 <span style={{ color: 'var(--c-muted)' }}>({entries.length - shown})</span>
            </button>
          )}
          {!loading && !loadError && entries.length === 0 && (
            <p className="mt-2 text-[0.8rem]" style={{ color: 'var(--c-muted)' }}>
              첫 번째 축하글을 남겨 주세요.
            </p>
          )}
        </div>
      )}

      <AnimatePresence>
        {del && (
          <motion.div
            className="fixed inset-0 z-[85] flex items-end justify-center bg-black/25 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDel(null)}
          >
            <motion.div
              className="w-full max-w-[430px] rounded-t-[20px] p-6 text-left sm:rounded-[20px]"
              style={{ background: 'var(--c-bg)', paddingBottom: 'calc(24px + var(--safe-bottom))' }}
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="축하글 삭제"
            >
              <p className="text-[1rem]">{del.has_password ? '축하글 삭제' : '삭제 요청'}</p>
              <p className="mt-2 text-[0.82rem]" style={{ color: 'var(--c-muted)' }}>
                {del.has_password ? '작성할 때 입력한 비밀번호를 입력해 주세요.' : '비밀번호 없이 작성된 글이에요. 신랑·신부에게 삭제를 요청할까요?'}
              </p>
              {del.has_password && (
                <input className="field mt-4" type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} autoFocus placeholder="비밀번호" />
              )}
              <div className="mt-5 flex gap-2">
                <button type="button" className="tap btn-ghost flex-1" onClick={() => setDel(null)}>
                  취소
                </button>
                <button type="button" className="tap btn-primary flex-1" onClick={confirmDelete} disabled={del.has_password && delPw.length < 4}>
                  {del.has_password ? '삭제' : '요청하기'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionShell>
  )
}
