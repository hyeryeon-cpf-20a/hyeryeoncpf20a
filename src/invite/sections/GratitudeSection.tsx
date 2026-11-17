import type { Account, SectionOf } from '../../lib/types'
import { copyText } from '../../lib/util'
import { useInvite } from '../context'
import { Accordion } from '../ui/Accordion'
import { Reveal } from '../ui/Reveal'
import { Body, SectionShell, SectionTitle } from '../SectionShell'

function AccountRow({ a }: { a: Account }) {
  const { toast } = useInvite()
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-left">
      <div className="min-w-0">
        <p className="text-[0.74rem]" style={{ color: 'var(--c-accent)' }}>
          {a.label}
        </p>
        <p className="mt-0.5 text-[0.9rem]">
          {a.bank} <span className="tabular-nums">{a.number}</span>
        </p>
        <p className="text-[0.78rem]" style={{ color: 'var(--c-muted)' }}>
          예금주 {a.holder}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          className="tap btn-ghost !px-3.5 !py-2 !text-[0.76rem]"
          onClick={async () => {
            const ok = await copyText(`${a.bank} ${a.number}`.trim())
            toast(ok ? '계좌번호가 복사되었어요' : '복사에 실패했어요')
          }}
          aria-label={`${a.label} 계좌번호 복사`}
        >
          복사
        </button>
        {a.kakaoPayUrl && /^https:\/\//.test(a.kakaoPayUrl) && (
          <a href={a.kakaoPayUrl} target="_blank" rel="noreferrer" className="tap rounded-full px-3 py-1.5 text-[0.7rem]" style={{ background: '#FAE100', color: '#3A1D1D' }}>
            카카오페이
          </a>
        )}
      </div>
    </div>
  )
}

function Group({ title, accounts }: { title: string; accounts: Account[] }) {
  if (!accounts.length) return null
  return (
    <Accordion title={title}>
      <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--c-text) 8%, transparent)' }}>
        {accounts.map((a) => (
          <AccountRow key={a.id} a={a} />
        ))}
      </div>
    </Accordion>
  )
}

export function GratitudeSection({ section, selected }: { section: SectionOf<'gratitude'>; selected?: boolean }) {
  const s = section.settings
  return (
    <SectionShell section={section} selected={selected}>
      <Reveal>
        <SectionTitle eyebrow={s.eyebrow} title={s.title} />
      </Reveal>
      {s.description && (
        <Reveal delay={0.05}>
          <Body className="mb-9" style={{ color: 'var(--c-muted)', fontSize: 'calc(0.88rem * var(--body-scale,1))' }}>
            {s.description}
          </Body>
        </Reveal>
      )}
      <div className="space-y-3">
        <Reveal delay={0.1}>
          <Group title={s.groomTitle} accounts={s.groomAccounts} />
        </Reveal>
        <Reveal delay={0.16}>
          <Group title={s.brideTitle} accounts={s.brideAccounts} />
        </Reveal>
      </div>
    </SectionShell>
  )
}
