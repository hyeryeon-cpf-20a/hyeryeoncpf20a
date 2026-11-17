import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicInvitation } from '../lib/api'
import { isBackendConfigured } from '../lib/supabase'
import { DEFAULT_SLUG, defaultContent } from '../lib/defaults'
import type { PublicInvitation, RuntimeFlags } from '../lib/types'
import { errorMessage } from '../lib/util'
import { InvitationView } from './InvitationView'

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-8 text-center" style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>
      {children}
    </div>
  )
}

export default function InvitePage() {
  const { slug = DEFAULT_SLUG } = useParams()
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'ok'; inv: PublicInvitation } | { kind: 'missing' } | { kind: 'error'; message: string } | { kind: 'demo' }
  >(isBackendConfigured ? { kind: 'loading' } : { kind: 'demo' })

  useEffect(() => {
    if (!isBackendConfigured) return
    let cancelled = false
    fetchPublicInvitation(slug)
      .then((inv) => !cancelled && setState(inv ? { kind: 'ok', inv } : { kind: 'missing' }))
      .catch((e) => !cancelled && setState({ kind: 'error', message: errorMessage(e) }))
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (state.kind !== 'ok') return
    const sh = state.inv.content.share
    if (sh.title) document.title = sh.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', sh.description.replace(/\n/g, ' '))
  }, [state])

  if (state.kind === 'loading')
    return (
      <Centered>
        <p className="font-script animate-pulse text-[2.4rem] opacity-70">with love</p>
      </Centered>
    )
  if (state.kind === 'missing')
    return (
      <Centered>
        <p className="font-script text-[2.6rem]">Coming soon</p>
        <p className="mt-4 text-[0.9rem]" style={{ color: 'var(--c-muted)' }}>
          청첩장을 준비하고 있어요.
          <br />
          조금만 기다려 주세요.
        </p>
      </Centered>
    )
  if (state.kind === 'error')
    return (
      <Centered>
        <p className="text-[0.95rem]">청첩장을 불러오지 못했어요.</p>
        <p className="mt-2 text-[0.8rem]" style={{ color: 'var(--c-muted)' }}>
          {state.message}
        </p>
        <button type="button" className="tap btn-ghost mt-6" onClick={() => location.reload()}>
          다시 시도
        </button>
      </Centered>
    )

  if (state.kind === 'demo') {
    const flags: RuntimeFlags = {
      slug,
      invitationId: null,
      guestbookEnabled: false,
      guestbookPublic: false,
      uploadsEnabled: false,
      uploadsPublic: false,
      uploadsRequireApproval: true,
      preview: false,
    }
    return (
      <>
        <div
          className="fixed inset-x-0 top-0 z-[70] px-4 py-2 text-center text-[0.72rem]"
          style={{ background: '#514A43', color: '#FAF9F6', paddingTop: 'calc(8px + var(--safe-top))' }}
          role="status"
        >
          서버(Supabase)가 연결되지 않은 데모 화면이에요 · 축하글/사진 저장이 비활성화되어 있어요
        </div>
        <InvitationView content={defaultContent()} flags={flags} />
      </>
    )
  }

  const inv = state.inv
  const flags: RuntimeFlags = {
    slug: inv.slug,
    invitationId: inv.id,
    guestbookEnabled: inv.guestbook_enabled,
    guestbookPublic: inv.guestbook_public,
    uploadsEnabled: inv.uploads_enabled,
    uploadsPublic: inv.uploads_public,
    uploadsRequireApproval: inv.uploads_require_approval,
    preview: false,
  }
  return <InvitationView content={inv.content} flags={flags} />
}
