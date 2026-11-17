import { PALETTE } from '../lib/defaults'
import { SANS_FONTS, SCRIPT_FONTS, SERIF_FONTS } from '../lib/fonts'
import { formatKoFull, parseWedding } from '../lib/date'
import { useEditor } from './EditorContext'
import { Btn, ColorInput, Field, Group, Segmented, Select, Slider, TextInput, Toggle } from './ui'

const COLOR_LABELS: Record<keyof typeof PALETTE, string> = {
  bg: '메인 배경',
  bg2: '보조 배경',
  text: '글자색',
  accent: '포인트 (샴페인 골드)',
  sage: '보조 포인트 (세이지)',
  wax: '포인트 2 (로즈 브라운)',
  muted: '보조 글자색',
}

const PRESETS: { name: string; colors: typeof PALETTE }[] = [
  { name: 'Warm Ivory (기본)', colors: PALETTE },
  { name: 'Sage Garden', colors: { bg: '#F9FAF6', bg2: '#EEF1E8', text: '#4C5048', accent: '#A9A27F', sage: '#BCC6B2', wax: '#7E8F72', muted: '#959A8E' } },
  { name: 'Rosy Morning', colors: { bg: '#FBF8F6', bg2: '#F5ECE8', text: '#5A4A47', accent: '#C2A28E', sage: '#C9CDBF', wax: '#B07673', muted: '#A1918C' } },
  { name: 'Linen Grey', colors: { bg: '#F8F7F4', bg2: '#EFEDE8', text: '#4A4744', accent: '#A89F92', sage: '#B9BFB5', wax: '#8C7A70', muted: '#98938C' } },
]

export function ThemePanel() {
  const { draft, update } = useEditor()
  const t = draft.theme
  const p = parseWedding(draft.wedding)
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <p className="text-[11px] text-stone-400">모든 페이지에 적용</p>
        <p className="text-[15px] font-semibold text-stone-800">기본 정보 · 전체 디자인</p>
      </div>

      <Group title="결혼식 일시">
        <div className="grid grid-cols-2 gap-2">
          <Field label="날짜">
            <input
              type="date"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]"
              value={draft.wedding.date}
              onChange={(e) => e.target.value && update((d) => void (d.wedding.date = e.target.value))}
            />
          </Field>
          <Field label="시간">
            <input
              type="time"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px]"
              value={draft.wedding.time}
              onChange={(e) => e.target.value && update((d) => void (d.wedding.time = e.target.value))}
            />
          </Field>
        </div>
        <p className="text-[12px] text-stone-500">→ {formatKoFull(p)} (한국 시간 기준)</p>
        <p className="text-[11px] text-stone-400">달력, D-day, 메인 날짜, 마지막 인사가 이 값으로 자동 계산돼요.</p>
      </Group>

      <Group title="신랑 · 신부 이름">
        <div className="grid grid-cols-2 gap-2">
          <TextInput label="신랑 (한글)" value={draft.couple.groomKo} onChange={(v) => update((d) => void (d.couple.groomKo = v))} />
          <TextInput label="신부 (한글)" value={draft.couple.brideKo} onChange={(v) => update((d) => void (d.couple.brideKo = v))} />
          <TextInput label="신랑 (영문)" value={draft.couple.groomEn} onChange={(v) => update((d) => void (d.couple.groomEn = v))} />
          <TextInput label="신부 (영문)" value={draft.couple.brideEn} onChange={(v) => update((d) => void (d.couple.brideEn = v))} />
        </div>
      </Group>

      <Group title="색상">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((pr) => (
            <button
              key={pr.name}
              type="button"
              onClick={() => update((d) => void (d.theme.colors = { ...pr.colors }))}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 px-2.5 py-1 text-[11.5px] text-stone-600 hover:bg-stone-50"
            >
              <span className="flex -space-x-1">
                {[pr.colors.bg2, pr.colors.accent, pr.colors.wax].map((c) => (
                  <span key={c} className="h-3 w-3 rounded-full border border-white" style={{ background: c }} />
                ))}
              </span>
              {pr.name}
            </button>
          ))}
        </div>
        {(Object.keys(COLOR_LABELS) as (keyof typeof PALETTE)[]).map((k) => (
          <ColorInput key={k} label={COLOR_LABELS[k]} value={t.colors[k]} onChange={(v) => update((d) => void (d.theme.colors[k] = v))} />
        ))}
      </Group>

      <Group title="폰트">
        <Select label="영문 필기체 (이름 · Thank you)" value={t.fonts.script} onChange={(v) => update((d) => void (d.theme.fonts.script = v))} options={SCRIPT_FONTS.map((f) => ({ value: f.family, label: f.label }))} />
        <Select label="영문 세리프 (제목 · 날짜)" value={t.fonts.serif} onChange={(v) => update((d) => void (d.theme.fonts.serif = v))} options={SERIF_FONTS.map((f) => ({ value: f.family, label: f.label }))} />
        <Select label="한글 본문" value={t.fonts.sans} onChange={(v) => update((d) => void (d.theme.fonts.sans = v))} options={SANS_FONTS.map((f) => ({ value: f.family, label: f.label }))} />
        <Slider label="기본 글자 크기" min={13} max={18} step={0.5} value={t.baseFontSize} onChange={(v) => update((d) => void (d.theme.baseFontSize = v))} format={(n) => `${n}px`} />
        <Slider label="자간" min={-0.03} max={0.08} step={0.005} value={t.letterSpacing} onChange={(v) => update((d) => void (d.theme.letterSpacing = v))} format={(n) => `${n.toFixed(3)}em`} />
      </Group>

      <Group title="페이지 내비게이션">
        <Toggle label="세로 내비게이션 표시" checked={draft.nav.enabled} onChange={(v) => update((d) => void (d.nav.enabled = v))} />
        <Segmented
          label="위치"
          value={draft.nav.position}
          onChange={(v) => update((d) => void (d.nav.position = v))}
          options={[
            { value: 'left', label: '왼쪽' },
            { value: 'right', label: '오른쪽' },
          ]}
        />
        <Toggle label="현재 페이지 이름 항상 표시" checked={draft.nav.showLabels} onChange={(v) => update((d) => void (d.nav.showLabels = v))} hint="끄면 점을 눌렀을 때만 잠깐 표시돼요. 이름은 왼쪽 목록에서 더블클릭해 바꿀 수 있어요." />
      </Group>

      <Group title="전체 애니메이션">
        <Toggle label="애니메이션 사용" checked={draft.animation.enabled} onChange={(v) => update((d) => void (d.animation.enabled = v))} hint="하객 기기의 ‘동작 줄이기’ 설정은 항상 존중돼요." />
        <Slider label="전체 속도" min={0.5} max={2} step={0.1} value={draft.animation.speed} onChange={(v) => update((d) => void (d.animation.speed = v))} format={(n) => `×${n}`} />
        <Btn onClick={() => update((d) => d.sections.forEach((s) => (s.style.animation.enabled = true)))}>모든 페이지 애니메이션 켜기</Btn>
      </Group>
    </div>
  )
}
