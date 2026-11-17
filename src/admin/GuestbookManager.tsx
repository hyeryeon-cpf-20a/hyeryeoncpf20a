import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminDeleteGuestbook, adminListGuestbook, adminUpdateGuestbook, type AdminFlags, type AdminGuestbookEntry } from '../lib/api'
import { errorMessage } from '../lib/util'
import { Btn, Segmented, Toggle } from './ui'

export function GuestbookManager({
  invitationId,
  flags,
  setFlags,
  toast,
}: {
  invitationId: string
  flags: AdminFlags
  setFlags: (p: Partial<AdminFlags>) => Promise<void>
  toast: (m: string, k?: 'ok' | 'error') => void
}) {
  const [rows, setRows] = useState<AdminGuestbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden' | 'requested'>('all')
  const [sel, setSel] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await adminListGuestbook(invitationId))
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [invitationId, toast])
  useEffect(() => {
    void load()
  }, [load])

  const shown = useMemo(
    () =>
      rows.filter((r) =>
        filter === 'all' ? true : filter === 'visible' ? !r.is_hidden : filter === 'hidden' ? r.is_hidden : r.delete_requested,
      ),
    [rows, filter],
  )

  async function setHidden(ids: string[], hidden: boolean) {
    try {
      for (const id of ids) await adminUpdateGuestbook(id, { is_hidden: hidden, ...(hidden ? {} : {}) })
      setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, is_hidden: hidden } : r)))
      setSel([])
      toast(hidden ? '숨겼어요' : '공개했어요')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }
  async function remove(ids: string[]) {
    if (!confirm(`${ids.length}개의 축하글을 영구 삭제할까요?`)) return
    try {
      await adminDeleteGuestbook(ids)
      setRows((prev) => prev.filter((r) => !ids.includes(r.id)))
      setSel([])
      toast('삭제했어요')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const requested = rows.filter((r) => r.delete_requested).length

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-[20px] font-semibold text-stone-800">축하글 관리</h1>
      <p className="mt-1 text-[13px] text-stone-500">하객이 남긴 축하글이 서버에 저장되어 있어요. 아래 설정은 게시 없이 바로 적용됩니다.</p>

      <div className="mt-5 grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
        <Toggle label="축하글 작성 허용" checked={flags.guestbook_enabled} onChange={(v) => setFlags({ guestbook_enabled: v })} hint="끄면 하객 화면에서 작성 버튼 대신 안내 문구가 보여요." />
        <Toggle label="축하글 목록 공개" checked={flags.guestbook_public} onChange={(v) => setFlags({ guestbook_public: v })} hint="끄면 하객은 글을 쓸 수만 있고, 목록은 두 분만 볼 수 있어요." />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-auto sm:min-w-[380px]">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `전체 ${rows.length}` },
              { value: 'visible', label: `공개 ${rows.filter((r) => !r.is_hidden).length}` },
              { value: 'hidden', label: `숨김 ${rows.filter((r) => r.is_hidden).length}` },
              { value: 'requested', label: `삭제요청 ${requested}` },
            ]}
          />
        </div>
        <Btn variant="ghost" onClick={load}>
          새로고침
        </Btn>
        {sel.length > 0 && (
          <div className="ml-auto flex gap-1.5">
            <Btn onClick={() => setHidden(sel, true)}>숨기기 ({sel.length})</Btn>
            <Btn onClick={() => setHidden(sel, false)}>공개</Btn>
            <Btn variant="danger" onClick={() => remove(sel)}>
              삭제
            </Btn>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {loading && <p className="py-8 text-center text-[13px] text-stone-400">불러오는 중…</p>}
        {!loading && shown.length === 0 && <p className="rounded-xl border border-dashed border-stone-200 py-12 text-center text-[13px] text-stone-400">축하글이 없어요.</p>}
        {shown.map((r) => (
          <div key={r.id} className={`flex gap-3 rounded-xl border bg-white p-4 ${r.is_hidden ? 'border-stone-200 opacity-60' : 'border-stone-200'}`}>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#514A43]"
              checked={sel.includes(r.id)}
              onChange={(e) => setSel((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-stone-500">
                <b className="text-[13px] font-semibold text-stone-800">{r.author}</b>
                <span>{new Date(r.created_at).toLocaleString('ko-KR')}</span>
                {r.is_hidden && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10.5px]">숨김</span>}
                {r.delete_requested && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10.5px] text-red-600">삭제 요청됨</span>}
                {r.password_hash && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10.5px]">비밀번호 설정</span>}
              </div>
              <p className="mt-1.5 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-stone-700">{r.message}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <Btn variant="ghost" onClick={() => setHidden([r.id], !r.is_hidden)}>
                {r.is_hidden ? '공개' : '숨기기'}
              </Btn>
              <Btn variant="ghost" className="!text-red-500" onClick={() => remove([r.id])}>
                삭제
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
