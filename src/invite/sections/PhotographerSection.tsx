import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GuestPhoto, SectionOf } from '../../lib/types'
import { listGuestPhotos, uploadGuestPhoto } from '../../lib/api'
import { isAcceptedImage } from '../../lib/image'
import { isBackendConfigured } from '../../lib/supabase'
import { errorMessage, uid } from '../../lib/util'
import { useInvite } from '../context'
import { Lightbox } from '../ui/Lightbox'
import { Reveal } from '../ui/Reveal'
import { Body, SectionShell, SectionTitle } from '../SectionShell'

type ItemState = 'waiting' | 'compress' | 'upload' | 'done' | 'error'
interface Item {
  id: string
  file: File
  preview: string
  state: ItemState
  error?: string
}

export function PhotographerSection({ section, selected }: { section: SectionOf<'photographer'>; selected?: boolean }) {
  const { flags, toast } = useInvite()
  const s = section.settings
  const [items, setItems] = useState<Item[]>([])
  const [author, setAuthor] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [doneCount, setDoneCount] = useState<number | null>(null)
  const [photos, setPhotos] = useState<GuestPhoto[]>([])
  const [open, setOpen] = useState<number | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  const canUpload = isBackendConfigured && flags.uploadsEnabled && !flags.preview && !!flags.invitationId
  const canSee = isBackendConfigured && flags.uploadsPublic

  const loadPhotos = useCallback(async () => {
    if (!canSee) return
    try {
      setPhotos(await listGuestPhotos(flags.slug))
    } catch {
      /* 공개 사진 목록 오류는 조용히 무시 */
    }
  }, [canSee, flags.slug])

  useEffect(() => {
    void loadPhotos()
  }, [loadPhotos])

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.preview)), []) // eslint-disable-line react-hooks/exhaustive-deps

  function addFiles(list: FileList | null) {
    if (!list) return
    const max = s.maxFiles || 20
    const next: Item[] = []
    const rejected: string[] = []
    for (const f of Array.from(list)) {
      if (!isAcceptedImage(f)) {
        rejected.push(`${f.name}: 지원하지 않는 형식`)
        continue
      }
      if (f.size > Math.min(s.maxSizeMb || 15, 15) * 1024 * 1024) {
        rejected.push(`${f.name}: ${Math.min(s.maxSizeMb || 15, 15)}MB를 넘는 파일이에요`)
        continue
      }
      next.push({ id: uid(), file: f, preview: URL.createObjectURL(f), state: 'waiting' })
    }
    setItems((prev) => {
      const merged = [...prev.filter((p) => p.state !== 'done'), ...next]
      if (merged.length > max) {
        toast(`한 번에 최대 ${max}장까지 올릴 수 있어요`)
        merged.slice(max).forEach((m) => URL.revokeObjectURL(m.preview))
        return merged.slice(0, max)
      }
      return merged
    })
    if (rejected.length) toast(rejected[0])
    setDoneCount(null)
  }

  async function uploadAll() {
    if (!canUpload || busy) return
    if (!consent) return toast('개인정보 수집·이용에 동의해 주세요')
    const queue = items.filter((i) => i.state === 'waiting' || i.state === 'error')
    if (!queue.length) return toast('사진을 선택해 주세요')
    setBusy(true)
    let ok = 0
    const set = (id: string, patch: Partial<Item>) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    // 동시에 2장씩 업로드
    const workers = Array.from({ length: Math.min(2, queue.length) }, async () => {
      while (queue.length) {
        const it = queue.shift()!
        try {
          await uploadGuestPhoto(
            { slug: flags.slug, invitationId: flags.invitationId!, file: it.file, author, message, consent },
            (phase) => set(it.id, { state: phase === 'done' ? 'done' : phase }),
          )
          set(it.id, { state: 'done' })
          ok++
        } catch (e) {
          set(it.id, { state: 'error', error: errorMessage(e) })
        }
      }
    })
    await Promise.all(workers)
    setBusy(false)
    setDoneCount(ok)
    if (ok) {
      toast(`${ok}장의 사진이 업로드되었어요`)
      if (!flags.uploadsRequireApproval) void loadPhotos()
    }
  }

  const progress = useMemo(() => {
    if (!items.length) return 0
    const w = { waiting: 0, compress: 0.25, upload: 0.6, done: 1, error: 1 }
    return items.reduce((a, i) => a + w[i.state], 0) / items.length
  }, [items])

  const remove = (id: string) =>
    setItems((prev) => {
      const t = prev.find((p) => p.id === id)
      if (t) URL.revokeObjectURL(t.preview)
      return prev.filter((p) => p.id !== id)
    })

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
          서버(Supabase)가 아직 연결되지 않아 사진을 올릴 수 없어요.
        </p>
      ) : !flags.uploadsEnabled ? (
        <p className="soft-card px-5 py-4 text-[0.84rem]" style={{ color: 'var(--c-muted)' }}>
          {s.disabledText}
        </p>
      ) : (
        <Reveal delay={0.1} className="soft-card p-4 text-left">
          {flags.preview && (
            <p className="mb-3 text-[0.76rem]" style={{ color: 'var(--c-wax)' }}>
              미리보기에서는 업로드되지 않아요.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="tap btn-ghost flex min-h-[48px] items-center justify-center gap-2" onClick={() => pickRef.current?.click()} disabled={busy}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="2" />
                <path d="M21 17l-5-5-8 8" />
              </svg>
              앨범에서 선택
            </button>
            <button type="button" className="tap btn-ghost flex min-h-[48px] items-center justify-center gap-2" onClick={() => camRef.current?.click()} disabled={busy}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              카메라로 촬영
            </button>
          </div>
          <input ref={pickRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          <p className="mt-2 text-center text-[0.7rem]" style={{ color: 'var(--c-muted)' }}>
            JPG · PNG · WEBP · HEIC / 최대 {s.maxFiles}장 · 장당 {s.maxSizeMb}MB (자동 압축)
          </p>

          {items.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-1.5">
              <AnimatePresence>
                {items.map((it) => (
                  <motion.div
                    key={it.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-square overflow-hidden rounded-[6px]"
                    style={{ background: 'var(--c-bg2)' }}
                  >
                    <img src={it.preview} alt="" className="h-full w-full object-cover" />
                    {it.state !== 'waiting' && (
                      <div
                        className="absolute inset-0 flex items-center justify-center text-[0.66rem] text-white"
                        style={{ background: it.state === 'done' ? 'rgba(81,74,67,.35)' : it.state === 'error' ? 'rgba(168,107,105,.7)' : 'rgba(81,74,67,.5)' }}
                        title={it.error}
                      >
                        {it.state === 'done' ? '✓' : it.state === 'error' ? '실패' : it.state === 'compress' ? '준비 중' : '업로드 중'}
                      </div>
                    )}
                    {!busy && it.state !== 'done' && (
                      <button
                        type="button"
                        className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center text-white"
                        style={{ textShadow: '0 0 4px rgba(0,0,0,.5)' }}
                        onClick={() => remove(it.id)}
                        aria-label="선택 취소"
                      >
                        ×
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <input className="field" placeholder="이름 (선택)" maxLength={20} value={author} onChange={(e) => setAuthor(e.target.value)} />
            <input className="field" placeholder="짧은 메시지 (선택)" maxLength={100} value={message} onChange={(e) => setMessage(e.target.value)} />
            <label className="flex cursor-pointer items-start gap-2.5 text-[0.74rem] leading-relaxed" style={{ color: 'var(--c-muted)' }}>
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--c-text)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                <b className="font-medium" style={{ color: 'var(--c-text)' }}>
                  [필수] 개인정보 수집·이용 동의
                </b>
                <br />
                {s.consentText}
              </span>
            </label>
          </div>

          {busy && (
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, var(--c-text) 10%, transparent)' }} aria-label="업로드 진행률">
              <motion.div className="h-full" style={{ background: 'var(--c-accent)' }} animate={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}

          <button type="button" className="tap btn-primary mt-4 w-full" onClick={uploadAll} disabled={busy || !canUpload || !items.some((i) => i.state === 'waiting' || i.state === 'error')}>
            {busy ? `업로드 중… ${Math.round(progress * 100)}%` : `사진 올리기${items.filter((i) => i.state !== 'done').length ? ` (${items.filter((i) => i.state !== 'done').length})` : ''}`}
          </button>

          <AnimatePresence>
            {doneCount !== null && doneCount > 0 && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 text-center text-[0.84rem]">
                {flags.uploadsRequireApproval ? s.doneText : '소중한 사진 감사합니다!'}
              </motion.p>
            )}
          </AnimatePresence>
        </Reveal>
      )}

      {canSee && photos.length > 0 && (
        <div className="mt-10">
          <p className="eyebrow mb-4">Shared by guests · {photos.length}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((p, i) => (
              <button key={p.id} type="button" className="tap relative aspect-square overflow-hidden rounded-[4px]" style={{ background: 'var(--c-bg2)' }} onClick={() => setOpen(i)}>
                {p.url && <img src={p.url} alt={p.message || ''} loading="lazy" className="h-full w-full object-cover" />}
              </button>
            ))}
          </div>
          <Lightbox
            items={photos.filter((p) => p.url).map((p) => ({ src: p.url!, caption: p.message || undefined, sub: p.author ? `by ${p.author}` : undefined }))}
            index={open}
            onClose={() => setOpen(null)}
          />
        </div>
      )}
    </SectionShell>
  )
}
