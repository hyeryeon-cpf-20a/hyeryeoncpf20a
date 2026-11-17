import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminDeletePhotos, adminListGuestPhotos, adminSetPhotoStatus, type AdminFlags, type AdminGuestPhoto } from '../lib/api'
import { errorMessage } from '../lib/util'
import { Btn, Segmented, Toggle } from './ui'

const STATUS_LABEL = { pending: '승인 대기', approved: '공개', hidden: '비공개' }

async function fetchBlob(url: string) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`다운로드 실패 (${r.status})`)
  return r.blob()
}

function fileName(p: AdminGuestPhoto, i: number) {
  const ext = p.storage_path.split('.').pop()
  const who = (p.author || 'guest').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 20)
  const d = new Date(p.created_at)
  return `${String(i + 1).padStart(3, '0')}_${who}_${d.getMonth() + 1}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.${ext}`
}

export function PhotoManager({
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
  const [rows, setRows] = useState<AdminGuestPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'hidden'>('all')
  const [sel, setSel] = useState<string[]>([])
  const [zip, setZip] = useState<string | null>(null)
  const [view, setView] = useState<AdminGuestPhoto | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await adminListGuestPhotos(invitationId))
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [invitationId, toast])
  useEffect(() => {
    void load()
  }, [load])

  const shown = useMemo(() => rows.filter((r) => filter === 'all' || r.status === filter), [rows, filter])

  async function setStatus(ids: string[], status: AdminGuestPhoto['status']) {
    try {
      await adminSetPhotoStatus(ids, status)
      setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, status } : r)))
      setSel([])
      toast(status === 'approved' ? '승인되어 하객 화면에 공개됐어요' : '비공개로 바꿨어요')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }
  async function remove(ids: string[]) {
    if (!confirm(`${ids.length}장의 사진을 서버에서 영구 삭제할까요?`)) return
    try {
      await adminDeletePhotos(rows.filter((r) => ids.includes(r.id)))
      setRows((prev) => prev.filter((r) => !ids.includes(r.id)))
      setSel([])
      toast('삭제했어요')
      setView(null)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }
  async function downloadOne(p: AdminGuestPhoto) {
    if (!p.url) return
    try {
      const blob = await fetchBlob(p.url)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = fileName(p, rows.indexOf(p))
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }
  async function downloadZip(list: AdminGuestPhoto[]) {
    if (!list.length) return
    setZip(`0/${list.length}`)
    try {
      const { default: JSZip } = await import('jszip')
      const z = new JSZip()
      let n = 0
      for (const p of list) {
        if (p.url) z.file(fileName(p, rows.indexOf(p)), await fetchBlob(p.url))
        setZip(`${++n}/${list.length}`)
      }
      const blob = await z.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `wedding-guest-photos-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setZip(null)
    }
  }

  const pending = rows.filter((r) => r.status === 'pending').length

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-[20px] font-semibold text-stone-800">하객 사진 관리</h1>
      <p className="mt-1 text-[13px] text-stone-500">하객이 올린 사진은 비공개 저장소에 보관되고, 승인한 사진만 청첩장에 공개돼요.</p>

      <div className="mt-5 grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-3">
        <Toggle label="사진 업로드 허용" checked={flags.uploads_enabled} onChange={(v) => setFlags({ uploads_enabled: v })} />
        <Toggle label="승인 후 공개" checked={flags.uploads_require_approval} onChange={(v) => setFlags({ uploads_require_approval: v })} hint="끄면 업로드 즉시 공개돼요." />
        <Toggle label="공개 갤러리 표시" checked={flags.uploads_public} onChange={(v) => setFlags({ uploads_public: v })} hint="끄면 승인된 사진도 하객에게 보이지 않아요." />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-auto sm:min-w-[380px]">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `전체 ${rows.length}` },
              { value: 'pending', label: `대기 ${pending}` },
              { value: 'approved', label: `공개 ${rows.filter((r) => r.status === 'approved').length}` },
              { value: 'hidden', label: `비공개 ${rows.filter((r) => r.status === 'hidden').length}` },
            ]}
          />
        </div>
        <Btn variant="ghost" onClick={load}>
          새로고침
        </Btn>
        <Btn onClick={() => downloadZip(shown)} disabled={!!zip || !shown.length}>
          {zip ? `압축 중… ${zip}` : `보이는 사진 모두 다운로드 (${shown.length})`}
        </Btn>
      </div>
      {sel.length > 0 && (
        <div className="sticky top-0 z-10 mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-stone-200 bg-white/95 p-2 backdrop-blur">
          <span className="px-2 text-[12.5px] text-stone-600">{sel.length}장 선택</span>
          <Btn variant="primary" onClick={() => setStatus(sel, 'approved')}>
            승인 · 공개
          </Btn>
          <Btn onClick={() => setStatus(sel, 'hidden')}>비공개</Btn>
          <Btn onClick={() => downloadZip(rows.filter((r) => sel.includes(r.id)))} disabled={!!zip}>
            선택 다운로드
          </Btn>
          <Btn variant="danger" onClick={() => remove(sel)}>
            삭제
          </Btn>
          <Btn variant="ghost" onClick={() => setSel([])}>
            선택 해제
          </Btn>
        </div>
      )}

      {loading && <p className="py-10 text-center text-[13px] text-stone-400">불러오는 중…</p>}
      {!loading && shown.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-stone-200 py-14 text-center text-[13px] text-stone-400">사진이 없어요.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {shown.map((p) => {
          const on = sel.includes(p.id)
          return (
            <div key={p.id} className={`overflow-hidden rounded-xl border bg-white ${on ? 'border-[#8a7a66] ring-2 ring-[#8a7a66]/30' : 'border-stone-200'}`}>
              <div className="relative aspect-square bg-stone-100">
                {p.url && (
                  <button type="button" className="block h-full w-full" onClick={() => setView(p)}>
                    <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                )}
                <input
                  type="checkbox"
                  className="absolute left-2 top-2 h-4 w-4 accent-[#514A43]"
                  checked={on}
                  onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                />
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10.5px] ${
                    p.status === 'pending' ? 'bg-amber-100 text-amber-800' : p.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="p-2.5">
                <p className="truncate text-[12px] text-stone-700">{p.author || '이름 없음'}</p>
                {p.message && <p className="truncate text-[11px] text-stone-400">{p.message}</p>}
                <div className="mt-2 flex gap-1">
                  {p.status !== 'approved' ? (
                    <Btn variant="primary" className="flex-1 !px-1.5" onClick={() => setStatus([p.id], 'approved')}>
                      승인
                    </Btn>
                  ) : (
                    <Btn className="flex-1 !px-1.5" onClick={() => setStatus([p.id], 'hidden')}>
                      내리기
                    </Btn>
                  )}
                  <Btn variant="ghost" className="!px-1.5" onClick={() => downloadOne(p)} title="다운로드">
                    ↓
                  </Btn>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {view && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-stone-950/90 p-4" onClick={() => setView(null)}>
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Btn onClick={() => downloadOne(view)}>다운로드</Btn>
            <Btn variant="danger" onClick={() => remove([view.id])}>
              삭제
            </Btn>
            <Btn onClick={() => setView(null)}>닫기</Btn>
          </div>
          <img src={view.url} alt="" className="m-auto max-h-[85vh] max-w-full object-contain" />
          <p className="text-center text-[13px] text-white/70">
            {view.author} {view.message && `· ${view.message}`} · {new Date(view.created_at).toLocaleString('ko-KR')}
          </p>
        </div>
      )}
    </div>
  )
}
