import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminDeleteRsvps, adminListRsvps, type RsvpRow } from '../lib/api'
import { errorMessage } from '../lib/util'
import { useEditor } from './EditorContext'
import { Btn, Group, Segmented, TextArea, TextInput, Toggle } from './ui'

const SIDE = { groom: '신랑측', bride: '신부측' } as const
const MEAL = { yes: '식사', no: '안 함', undecided: '미정' } as const

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-[11.5px] text-stone-400">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-stone-800">{value}</p>
      {sub && <p className="mt-0.5 text-[11.5px] text-stone-500">{sub}</p>}
    </div>
  )
}

export function RsvpManager({ dataId, toast }: { dataId: string; toast: (m: string, k?: 'ok' | 'error') => void }) {
  const { draft, update } = useEditor()
  const r = draft.rsvp
  const [rows, setRows] = useState<RsvpRow[]>([])
  const [loading, setLoading] = useState(true)
  const [needsSql, setNeedsSql] = useState(false)
  const [filter, setFilter] = useState<'all' | 'yes' | 'no'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await adminListRsvps(dataId))
      setNeedsSql(false)
    } catch (e) {
      if (/rsvps|relation|schema cache/i.test(String((e as Error).message))) setNeedsSql(true)
      else toast(errorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [dataId, toast])
  useEffect(() => {
    void load()
  }, [load])

  const sum = useMemo(() => {
    const yes = rows.filter((x) => x.attending)
    const people = yes.reduce((a, x) => a + (x.party_size || 1), 0)
    const by = (side: 'groom' | 'bride') => yes.filter((x) => x.side === side).reduce((a, x) => a + (x.party_size || 1), 0)
    const meal = yes.filter((x) => x.meal === 'yes').reduce((a, x) => a + (x.party_size || 1), 0)
    return { yes: yes.length, people, groom: by('groom'), bride: by('bride'), no: rows.length - yes.length, meal }
  }, [rows])

  const shown = rows.filter((x) => filter === 'all' || (filter === 'yes' ? x.attending : !x.attending))

  function downloadCsv() {
    const head = ['이름', '구분', '참석', '인원', '식사', '받은 주소', '회신 시각']
    const lines = rows.map((x) =>
      [
        x.name,
        x.side ? SIDE[x.side] : '',
        x.attending ? '참석' : '불참',
        x.attending ? x.party_size : 0,
        x.meal ? MEAL[x.meal] : '',
        x.version_slug ?? '',
        new Date(x.updated_at).toLocaleString('ko-KR'),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    // 엑셀에서 한글이 깨지지 않도록 BOM 포함
    const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rsvp-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 3000)
  }

  async function remove(ids: string[]) {
    if (!confirm(`${ids.length}개의 회신을 삭제할까요?`)) return
    try {
      await adminDeleteRsvps(ids)
      setRows((p) => p.filter((x) => !ids.includes(x.id)))
      toast('삭제했어요')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-[20px] font-semibold text-stone-800">참석 회신</h1>
      <p className="mt-1 text-[13px] text-stone-500">봉투가 열린 뒤 하객에게 참석 여부를 묻는 팝업이 떠요. 모든 버전의 회신이 여기에 모여요.</p>

      {needsSql ? (
        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-[12.5px] leading-relaxed text-amber-900">
          참석 회신을 저장하려면 Supabase <b>SQL Editor</b>에서 <code className="rounded bg-white px-1">supabase/migrations/20261119000000_rsvp.sql</code> 파일 내용을 한 번 실행해 주세요.
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="참석 예상 인원" value={`${sum.people}명`} sub={`회신 ${sum.yes}건`} />
            <Stat label="신랑측 / 신부측" value={`${sum.groom} / ${sum.bride}`} sub="참석 인원 기준" />
            <Stat label="식사 예정" value={`${sum.meal}명`} />
            <Stat label="불참" value={`${sum.no}건`} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-[280px]">
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: `전체 ${rows.length}` },
                  { value: 'yes', label: `참석 ${sum.yes}` },
                  { value: 'no', label: `불참 ${sum.no}` },
                ]}
              />
            </div>
            <Btn variant="ghost" onClick={load}>
              새로고침
            </Btn>
            <Btn onClick={downloadCsv} disabled={!rows.length} className="ml-auto">
              엑셀(CSV) 다운로드
            </Btn>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="bg-stone-50 text-[11.5px] text-stone-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">이름</th>
                  <th className="px-3 py-2.5 font-medium">구분</th>
                  <th className="px-3 py-2.5 font-medium">참석</th>
                  <th className="px-3 py-2.5 font-medium">인원</th>
                  <th className="px-3 py-2.5 font-medium">식사</th>
                  <th className="px-3 py-2.5 font-medium">회신 시각</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                      불러오는 중…
                    </td>
                  </tr>
                )}
                {!loading && shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-stone-400">
                      아직 회신이 없어요.
                    </td>
                  </tr>
                )}
                {shown.map((x) => (
                  <tr key={x.id} className="border-t border-stone-100">
                    <td className="px-4 py-2.5 font-medium text-stone-800">{x.name}</td>
                    <td className="px-3 py-2.5 text-stone-600">{x.side ? SIDE[x.side] : '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11.5px] ${x.attending ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                        {x.attending ? '참석' : '불참'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{x.attending ? `${x.party_size}명` : '-'}</td>
                    <td className="px-3 py-2.5 text-stone-600">{x.meal ? MEAL[x.meal] : '-'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-stone-400">{new Date(x.updated_at).toLocaleString('ko-KR')}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button type="button" className="text-[12px] text-stone-400 hover:text-red-600" onClick={() => remove([x.id])}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white">
        <Group title="팝업 설정 (게시하기를 눌러야 하객 화면에 반영돼요)">
          <Toggle label="봉투가 열린 뒤 참석 여부 팝업 띄우기" checked={r.enabled} onChange={(v) => {
            if (v && needsSql) return toast('먼저 위 안내대로 SQL을 실행해 주세요', 'error')
            update((d) => void (d.rsvp.enabled = v))
          }} hint="끄면 팝업과 달력 아래 ‘참석 여부 전달하기’ 버튼이 모두 사라져요." />
          <TextInput label="제목" value={r.title} onChange={(v) => update((d) => void (d.rsvp.title = v))} />
          <TextArea label="안내 문구" value={r.description} rows={2} onChange={(v) => update((d) => void (d.rsvp.description = v))} />
          <TextInput label="회신 마감 안내 (선택)" value={r.deadline} placeholder="예: 5월 1일까지 알려주세요" onChange={(v) => update((d) => void (d.rsvp.deadline = v))} />
          <Toggle label="신랑측 / 신부측 묻기" checked={r.askSide} onChange={(v) => update((d) => void (d.rsvp.askSide = v))} />
          <Toggle label="참석 인원 묻기 (본인 포함)" checked={r.askPartySize} onChange={(v) => update((d) => void (d.rsvp.askPartySize = v))} />
          <Toggle label="식사 여부 묻기" checked={r.askMeal} onChange={(v) => update((d) => void (d.rsvp.askMeal = v))} />
          <TextArea label="‘참석’으로 보냈을 때 문구" value={r.attendMessage} rows={2} onChange={(v) => update((d) => void (d.rsvp.attendMessage = v))} />
          <TextArea label="‘불참’으로 보냈을 때 문구" value={r.declineMessage} rows={2} onChange={(v) => update((d) => void (d.rsvp.declineMessage = v))} />
        </Group>
      </div>
    </div>
  )
}
