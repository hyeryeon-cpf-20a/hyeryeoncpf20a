import { useState, type ReactNode } from 'react'
import type {
  Account,
  Aspect,
  EventTab,
  ProgramItem,
  InfoItem,
  PersonProfile,
  Section,
  SectionOf,
  SectionStyle,
  SectionType,
  SettingsOf,
} from '../lib/types'
import { defaultEventTabs, PALETTE, SECTION_META } from '../lib/defaults'
import { imageSrc } from '../lib/image'
import { uid } from '../lib/util'
import { useEditor } from './EditorContext'
import { assetToImage, CropDialog, ImageField } from './MediaLibrary'
import { SortableList } from './SortableList'
import { Btn, ColorInput, Group, Icon, NumberInput, Segmented, Select, Slider, TextArea, TextInput, Toggle } from './ui'

const ASPECTS: { value: Aspect; label: string }[] = [
  { value: 'original', label: '원본 비율' },
  { value: '1:1', label: '1:1 정사각형' },
  { value: '4:5', label: '4:5' },
  { value: '3:4', label: '3:4' },
  { value: '2:3', label: '2:3' },
  { value: '9:16', label: '9:16 세로' },
  { value: '4:3', label: '4:3 가로' },
  { value: '3:2', label: '3:2 가로' },
  { value: '16:9', label: '16:9 가로' },
]

/** 섹션 설정을 수정하는 헬퍼 */
function useSection<T extends SectionType>(id: string) {
  const { draft, update } = useEditor()
  const section = draft.sections.find((s) => s.id === id) as SectionOf<T>
  const set = (fn: (s: SettingsOf<T>) => void) =>
    update((d) => {
      const sec = d.sections.find((s) => s.id === id)
      if (sec) fn(sec.settings as SettingsOf<T>)
    })
  return { section, s: section.settings as SettingsOf<T>, set }
}

// ------------------------------------------------------------------ 스타일 공통

function StylePanel({ id }: { id: string }) {
  const { draft, update } = useEditor()
  const sec = draft.sections.find((s) => s.id === id)!
  const st = sec.style
  const set = (fn: (s: SectionStyle) => void) => update((d) => fn(d.sections.find((s) => s.id === id)!.style))
  return (
    <>
      <Group title="페이지">
        <TextInput label="내비게이션에 표시할 이름" value={sec.label} onChange={(v) => update((d) => void (d.sections.find((s) => s.id === id)!.label = v))} maxLength={24} />
        <Toggle label="이 페이지 숨기기" checked={sec.hidden} onChange={(v) => update((d) => void (d.sections.find((s) => s.id === id)!.hidden = v))} hint="숨긴 페이지는 하객 화면과 내비게이션에서 빠집니다." />
      </Group>
      {sec.type !== 'envelope' && (
        <>
          <Group title="레이아웃 · 여백">
            <Toggle label="화면 1개 높이에 맞추기" checked={st.fitScreen} onChange={(v) => set((s) => void (s.fitScreen = v))} hint="내용이 길면 자연스럽게 아래로 늘어납니다." />
            <Segmented
              label="정렬"
              value={st.align}
              onChange={(v) => set((s) => void (s.align = v))}
              options={[
                { value: 'left', label: '왼쪽' },
                { value: 'center', label: '가운데' },
                { value: 'right', label: '오른쪽' },
              ]}
            />
            <Slider label="위 여백" min={0} max={200} value={st.paddingTop} onChange={(v) => set((s) => void (s.paddingTop = v))} format={(n) => `${n}px`} />
            <Slider label="아래 여백" min={0} max={200} value={st.paddingBottom} onChange={(v) => set((s) => void (s.paddingBottom = v))} format={(n) => `${n}px`} />
          </Group>
          <Group title="글자 · 색상">
            <Slider label="제목 크기" min={0.7} max={1.6} step={0.05} value={st.titleScale} onChange={(v) => set((s) => void (s.titleScale = v))} format={(n) => `${Math.round(n * 100)}%`} />
            <Slider label="본문 크기" min={0.8} max={1.4} step={0.05} value={st.bodyScale} onChange={(v) => set((s) => void (s.bodyScale = v))} format={(n) => `${Math.round(n * 100)}%`} />
            <Segmented
              label="배경"
              value={st.background}
              onChange={(v) => set((s) => void (s.background = v))}
              options={[
                { value: 'bg', label: '아이보리' },
                { value: 'bg2', label: '크림' },
                { value: 'custom', label: '직접 선택' },
              ]}
            />
            {st.background === 'custom' && (
              <ColorInput label="배경 색" value={st.customBackground || '#FFFFFF'} onChange={(v) => set((s) => void (s.customBackground = v))} presets={[PALETTE.bg, PALETTE.bg2, '#FFFFFF', '#EEF0EA', '#F6EEEC']} />
            )}
            <Toggle label="글자색 따로 지정" checked={!!st.textColor} onChange={(v) => set((s) => void (s.textColor = v ? draft.theme.colors.text : undefined))} />
            {st.textColor && <ColorInput label="글자색" value={st.textColor} onChange={(v) => set((s) => void (s.textColor = v))} />}
          </Group>
          <Group title="애니메이션">
            <Toggle label="진입 애니메이션" checked={st.animation.enabled} onChange={(v) => set((s) => void (s.animation.enabled = v))} />
            {st.animation.enabled && (
              <>
                <Segmented
                  label="효과"
                  value={st.animation.type}
                  onChange={(v) => set((s) => void (s.animation.type = v))}
                  options={[
                    { value: 'fade', label: '페이드' },
                    { value: 'slide-up', label: '슬라이드업' },
                    { value: 'zoom', label: '줌' },
                  ]}
                />
                <Slider label="속도(지속 시간)" min={0.3} max={2.5} step={0.1} value={st.animation.duration} onChange={(v) => set((s) => void (s.animation.duration = v))} format={(n) => `${n.toFixed(1)}초`} />
              </>
            )}
          </Group>
        </>
      )}
    </>
  )
}

// ------------------------------------------------------------------ 섹션별 콘텐츠

function TitleFields({ s, set }: { s: { eyebrow: string; title: string }; set: (fn: (x: { eyebrow: string; title: string }) => void) => void }) {
  return (
    <>
      <TextInput label="영문 소제목" value={s.eyebrow} onChange={(v) => set((x) => void (x.eyebrow = v))} />
      <TextInput label="제목" value={s.title} onChange={(v) => set((x) => void (x.title = v))} />
    </>
  )
}

function EnvelopeEditor({ id }: { id: string }) {
  const { s, set } = useSection<'envelope'>(id)
  return (
    <>
      <Group title="봉투">
        <Segmented
          label="시작 화면"
          value={s.startView}
          onChange={(v) => set((x) => void (x.startView = v))}
          options={[
            { value: 'closeup', label: '실링 클로즈업 (화면 가득)' },
            { value: 'full', label: '봉투 전체' },
          ]}
        />
        <ColorInput label="봉투 색상" value={s.envelopeColor} onChange={(v) => set((x) => void (x.envelopeColor = v))} presets={['#F7F3EC', '#FAF9F6', '#F1ECE3', '#EEF0EA', '#F3E9E6', '#2F3B5C', '#5B4B45', '#7A8A74']} />
        <ColorInput label="안쪽 라이닝 색상" value={s.liningColor} onChange={(v) => set((x) => void (x.liningColor = v))} presets={['#EFE8DC', '#E3E7DC', '#EBD9D5', '#E8DFCF']} />
        <Select
          label="종이 질감"
          value={s.texture}
          onChange={(v) => set((x) => void (x.texture = v))}
          options={[
            { value: 'smooth', label: '매끈한 종이' },
            { value: 'cotton', label: '코튼 페이퍼' },
            { value: 'linen', label: '린넨' },
            { value: 'felt', label: '펠트 (결이 있는 종이)' },
          ]}
        />
        <TextInput label="안내 문구" value={s.hint} onChange={(v) => set((x) => void (x.hint = v))} />
      </Group>
      <Group title="봉투 스타일">
        <Segmented
          value={s.envStyle === 'pearl' ? 'pearl' : 'classic'}
          onChange={(v) => set((x) => void (x.envStyle = v))}
          options={[
            { value: 'classic', label: '클래식 (삼각 덮개)' },
            { value: 'pearl', label: '진주 (곡선 덮개)' },
          ]}
        />
        {s.envStyle === 'pearl' && (
          <>
            <TextArea label="위쪽 안내 문구" value={s.pearlTopText} rows={2} onChange={(v) => set((x) => void (x.pearlTopText = v))} hint="이름은 ‘기본 정보’의 영문 이름, 날짜는 결혼 날짜가 자동으로 들어가요." />
            <Segmented
              label="가운데 장식"
              value={s.pearlClosure === 'seal' ? 'seal' : 'pearl'}
              onChange={(v) => set((x) => void (x.pearlClosure = v))}
              options={[
                { value: 'pearl', label: '진주 한 알' },
                { value: 'seal', label: '실링왁스' },
              ]}
            />
          </>
        )}
      </Group>
      <Group title="봉투 테두리">
        <Toggle label="봉투 테두리 선" checked={!!s.outlineColor} onChange={(v) => set((x) => void (x.outlineColor = v ? '#1A1A1A' : ''))} />
        {s.outlineColor && <ColorInput label="테두리 선 색" value={s.outlineColor} onChange={(v) => set((x) => void (x.outlineColor = v))} presets={['#1A1A1A', '#514A43', '#E58AA8', '#B8A489']} />}
      </Group>
      <Group title="실링왁스">
        <ColorInput label="왁스 색상" value={s.waxColor} onChange={(v) => set((x) => void (x.waxColor = v))} presets={['#ECE9E4', PALETTE.wax, '#8E5A57', '#B8A489', '#8C9A80', '#6F6259', '#C9A0A0', '#E58AA8', '#1A1A1A']} />
        <Segmented
          label="문양"
          value={(['initials', 'heart', 'flower', 'shell'] as const).includes(s.waxEmblem) ? s.waxEmblem : 'initials'}
          onChange={(v) => set((x) => void (x.waxEmblem = v))}
          options={[
            { value: 'initials', label: '이니셜' },
            { value: 'heart', label: '하트' },
            { value: 'flower', label: '꽃' },
            { value: 'shell', label: '조개' },
          ]}
        />
        {!['heart', 'flower', 'shell'].includes(s.waxEmblem) && (
          <TextInput label="실링에 넣을 글자" value={s.waxInitials} onChange={(v) => set((x) => void (x.waxInitials = v))} maxLength={7} hint="예: C & J · 최대 7자" />
        )}
      </Group>
      <Group title="애니메이션">
        <Slider label="열리는 속도" min={0.5} max={2} step={0.1} value={s.speed} onChange={(v) => set((x) => void (x.speed = v))} format={(n) => (n < 1 ? `느리게 ×${n}` : n > 1 ? `빠르게 ×${n}` : '기본')} />
        <Toggle
          label="방문할 때마다 봉투 보여주기"
          checked={s.showOnEveryVisit}
          onChange={(v) => set((x) => void (x.showOnEveryVisit = v))}
          hint="끄면 같은 브라우저 창에서 다시 열 때는 바로 본문이 보입니다."
        />
      </Group>
    </>
  )
}

function MainEditor({ id }: { id: string }) {
  const { s, set } = useSection<'main'>(id)
  return (
    <>
      <Group title="텍스트">
        <TextInput label="영문 이름" value={s.namesEn} onChange={(v) => set((x) => void (x.namesEn = v))} />
        <Slider label="영문 이름 크기" min={1.6} max={4} step={0.1} value={s.namesSize} onChange={(v) => set((x) => void (x.namesSize = v))} format={(n) => `${n}rem`} />
        <TextInput label="날짜 표기" value={s.dateText} onChange={(v) => set((x) => void (x.dateText = v))} placeholder="비워 두면 결혼 날짜로 자동 (MAY 15, 2027)" />
        <TextInput label="하단 문구" value={s.fromText} onChange={(v) => set((x) => void (x.fromText = v))} />
      </Group>
      <Group title="메인 사진">
        <Segmented
          label="사진 모양"
          value={s.photoShape === 'rect' ? 'rect' : 'oval'}
          onChange={(v) => set((x) => void (x.photoShape = v))}
          options={[
            { value: 'oval', label: '긴 타원형' },
            { value: 'rect', label: '사각형' },
          ]}
        />
        {s.photoShape === 'rect' ? (
          <>
            <ImageField label="사진" value={s.photo} aspect={s.aspect} onChange={(v) => set((x) => void (x.photo = v))} onAspectChange={(a) => set((x) => void (x.aspect = a))} />
            <Select label="사진 비율" value={s.aspect} onChange={(v) => set((x) => void (x.aspect = v))} options={ASPECTS} />
            <Slider label="모서리 둥글기" min={0} max={200} value={s.photoRadius} onChange={(v) => set((x) => void (x.photoRadius = v))} format={(n) => (n >= 200 ? '아치' : `${n}px`)} />
          </>
        ) : (
          <ImageField label="사진" value={s.photo} aspect="3:5" onChange={(v) => set((x) => void (x.photo = v))} />
        )}
      </Group>
      <Group title="배경 사진">
        <Toggle label="같은 사진을 배경에 은은하게 깔기" checked={s.bgPhoto} onChange={(v) => set((x) => void (x.bgPhoto = v))} />
        {s.bgPhoto && (
          <>
            <Slider label="진하기" min={0.1} max={0.9} step={0.05} value={s.bgOpacity} onChange={(v) => set((x) => void (x.bgOpacity = v))} format={(n) => `${Math.round(n * 100)}%`} />
            <Slider label="흐림" min={0} max={40} value={s.bgBlur} onChange={(v) => set((x) => void (x.bgBlur = v))} format={(n) => (n === 0 ? '선명하게' : `${n}px`)} />
          </>
        )}
      </Group>
    </>
  )
}

function PersonEditor({ p, onChange }: { p: PersonProfile; onChange: (fn: (p: PersonProfile) => void) => void }) {
  return (
    <div className="space-y-3 rounded-xl bg-stone-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <TextInput label="구분" value={p.role} onChange={(v) => onChange((x) => void (x.role = v))} />
        <TextInput label="한글 이름" value={p.nameKo} onChange={(v) => onChange((x) => void (x.nameKo = v))} />
      </div>
      <TextInput label="영문 이름 (선택)" value={p.nameEn} onChange={(v) => onChange((x) => void (x.nameEn = v))} />
      <TextArea label="소개 문장" value={p.intro} rows={2} onChange={(v) => onChange((x) => void (x.intro = v))} />
      <TextInput label="부모님 (선택)" value={p.parents} onChange={(v) => onChange((x) => void (x.parents = v))} placeholder="예: 김철수 · 이영희의 장남" />
      <TextInput label="연락처 (선택)" value={p.phone} onChange={(v) => onChange((x) => void (x.phone = v))} placeholder="010-0000-0000" />
      <ImageField label="프로필 사진" value={p.photo} aspect="1:1" onChange={(v) => onChange((x) => void (x.photo = v))} />
    </div>
  )
}

function StoryEditor({ id }: { id: string }) {
  const { s, set } = useSection<'story'>(id)
  return (
    <>
      <Group title="소개">
        <TitleFields s={s} set={set as never} />
        <Segmented
          label="프로필 사진 모양"
          value={s.photoShape}
          onChange={(v) => set((x) => void (x.photoShape = v))}
          options={[
            { value: 'circle', label: '원형' },
            { value: 'rounded', label: '둥근 사각형' },
          ]}
        />
        <Segmented
          label="순서"
          value={s.order}
          onChange={(v) => set((x) => void (x.order = v))}
          options={[
            { value: 'groom-first', label: '신랑 먼저' },
            { value: 'bride-first', label: '신부 먼저' },
          ]}
        />
      </Group>
      <Group title="신랑">
        <PersonEditor p={s.groom} onChange={(fn) => set((x) => fn(x.groom))} />
      </Group>
      <Group title="신부">
        <PersonEditor p={s.bride} onChange={(fn) => set((x) => fn(x.bride))} />
      </Group>
      <Group title="카운트다운">
        <Toggle label="카운트다운 표시" checked={s.showCountdown} onChange={(v) => set((x) => void (x.showCountdown = v))} />
        <Select
          label="표시 방식"
          value={s.countdownMode}
          onChange={(v) => set((x) => void (x.countdownMode = v))}
          options={[
            { value: 'dday', label: 'D-120' },
            { value: 'full', label: '120 DAYS 08 HOURS 24 MINUTES' },
            { value: 'both', label: '둘 다' },
          ]}
        />
        <TextInput label="영문 소제목" value={s.countdownEyebrow} onChange={(v) => set((x) => void (x.countdownEyebrow = v))} />
        <TextInput label="안내 문구" value={s.countdownTitle} onChange={(v) => set((x) => void (x.countdownTitle = v))} hint="예: ‘저희의 결혼식까지 120일 남았습니다’ 의 앞부분" />
        <TextInput label="결혼식 이후 문구" value={s.afterText} onChange={(v) => set((x) => void (x.afterText = v))} hint="날짜가 지나면 카운트다운 대신 표시돼요." />
      </Group>
    </>
  )
}

function CalendarEditor({ id }: { id: string }) {
  const { s, set } = useSection<'calendar'>(id)
  return (
    <Group title="달력">
      <p className="rounded-lg bg-stone-50 px-3 py-2 text-[11.5px] text-stone-500">결혼 날짜·시간은 ‘기본 정보 · 전체 디자인’에서 바꾸면 자동으로 반영돼요.</p>
      <TitleFields s={s} set={set as never} />
      <Select
        label="날짜 강조 스타일"
        value={s.heartStyle}
        onChange={(v) => set((x) => void (x.heartStyle = v))}
        options={[
          { value: 'heart', label: '하트 (채움)' },
          { value: 'heart-outline', label: '하트 (선)' },
          { value: 'circle', label: '원 (채움)' },
          { value: 'ring', label: '원 (선)' },
        ]}
      />
      <ColorInput label="강조 색상" value={s.highlightColor} onChange={(v) => set((x) => void (x.highlightColor = v))} presets={[PALETTE.wax, PALETTE.accent, PALETTE.sage, PALETTE.text]} />
      <Segmented
        label="주 시작"
        value={s.weekStart}
        onChange={(v) => set((x) => void (x.weekStart = v))}
        options={[
          { value: 'sun', label: '일요일' },
          { value: 'mon', label: '월요일' },
        ]}
      />
      <Toggle label="요일을 한글로 (일 월 화…)" checked={s.showWeekNumbersInKorean} onChange={(v) => set((x) => void (x.showWeekNumbersInKorean = v))} />
      <TextInput label="시간 표기" value={s.timeText} onChange={(v) => set((x) => void (x.timeText = v))} placeholder="비워 두면 자동 (오후 12시 30분)" />
      <TextArea label="추가 문구 (선택)" value={s.note} onChange={(v) => set((x) => void (x.note = v))} rows={2} />
    </Group>
  )
}

function GalleryEditor({ id }: { id: string }) {
  const { s, set } = useSection<'gallery'>(id)
  const { pickImages } = useEditor()
  const [crop, setCrop] = useState<string | null>(null)
  const cropping = s.photos.find((p) => p.id === crop)
  return (
    <>
      <Group title="앨범">
        <TitleFields s={s} set={set as never} />
        <Segmented
          label="레이아웃"
          value={s.layout}
          onChange={(v) => set((x) => void (x.layout = v))}
          options={[
            { value: 'carousel', label: '큰사진+썸네일' },
            { value: 'grid', label: '그리드' },
            { value: 'slide', label: '슬라이드' },
            { value: 'editorial', label: '에디토리얼' },
          ]}
        />
        {s.layout === 'carousel' && (
          <Select label="큰 사진 비율" value={s.carouselAspect || '4:5'} onChange={(v) => set((x) => void (x.carouselAspect = v))} options={ASPECTS.filter((a) => a.value !== 'original')} />
        )}
        {s.layout === 'grid' && (
          <Segmented
            label="열 수"
            value={String(s.columns) as '2' | '3'}
            onChange={(v) => set((x) => void (x.columns = Number(v) as 2 | 3))}
            options={[
              { value: '2', label: '2열' },
              { value: '3', label: '3열' },
            ]}
          />
        )}
        {(s.layout === 'grid' || s.layout === 'editorial') && (
          <NumberInput label="처음에 보여줄 사진 수" value={s.initialCount} min={1} max={200} onChange={(v) => set((x) => void (x.initialCount = v ?? 9))} hint="나머지는 ‘사진 더보기’로 펼쳐집니다." />
        )}
      </Group>
      <Group
        title={`사진 ${s.photos.length}장`}
        action={
          <Btn
            variant="primary"
            onClick={async () => {
              const r = await pickImages({ multiple: true })
              if (r?.length) set((x) => void x.photos.push(...r.map((a) => ({ id: uid(), image: assetToImage(a), caption: '' }))))
            }}
          >
            {Icon.plus} 사진 추가
          </Btn>
        }
      >
        <p className="text-[11px] text-stone-400">드래그해서 순서를 바꾸세요. 사진을 누르면 위치·확대를 조정할 수 있어요.</p>
        <SortableList
          items={s.photos}
          onReorder={(next) => set((x) => void (x.photos = next))}
          className="space-y-2"
          render={(p, i, handle) => (
            <div className="flex items-center gap-2 rounded-lg bg-stone-50 p-1.5">
              {handle}
              <button type="button" onClick={() => setCrop(p.id)} className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-stone-200">
                {imageSrc(p.image) && <img src={imageSrc(p.image)!} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${p.image.focusX ?? 50}% ${p.image.focusY ?? 50}%` }} />}
              </button>
              <input
                className="min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[12px]"
                placeholder={`사진 ${i + 1} 설명 (선택)`}
                value={p.caption}
                onChange={(e) => set((x) => void (x.photos.find((y) => y.id === p.id)!.caption = e.target.value))}
              />
              <button type="button" className="rounded p-1.5 text-stone-400 hover:text-red-600" title="삭제" onClick={() => set((x) => void (x.photos = x.photos.filter((y) => y.id !== p.id)))}>
                {Icon.trash}
              </button>
            </div>
          )}
        />
        {cropping && (
          <CropDialog
            open
            onClose={() => setCrop(null)}
            value={cropping.image}
            aspect={s.layout === 'grid' ? '1:1' : '3:4'}
            onChange={(v) => set((x) => void (x.photos.find((y) => y.id === cropping.id)!.image = v))}
          />
        )}
      </Group>
    </>
  )
}

function InfoItemEditor({ it, onChange, onRemove, handle }: { it: InfoItem; onChange: (fn: (i: InfoItem) => void) => void; onRemove: () => void; handle: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg bg-stone-50">
      <div className="flex items-center gap-1 p-1.5">
        {handle}
        <button type="button" className="min-w-0 flex-1 truncate text-left text-[12.5px] text-stone-700" onClick={() => setOpen((o) => !o)}>
          {it.title || '(제목 없음)'}
        </button>
        <button type="button" className="rounded p-1 text-stone-400" onClick={() => setOpen((o) => !o)}>
          {open ? Icon.up : Icon.down}
        </button>
        <button type="button" className="rounded p-1 text-stone-400 hover:text-red-600" onClick={onRemove} title="삭제">
          {Icon.trash}
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-stone-200/70 p-3">
          <TextInput label="제목" value={it.title} onChange={(v) => onChange((x) => void (x.title = v))} />
          <TextArea label="내용" value={it.body} rows={4} onChange={(v) => onChange((x) => void (x.body = v))} />
          <ImageField label="이미지 (선택)" value={it.image} aspect="original" onChange={(v) => onChange((x) => void (x.image = v))} />
          <div className="grid grid-cols-2 gap-2">
            <TextInput label="링크 이름" value={it.linkLabel} onChange={(v) => onChange((x) => void (x.linkLabel = v))} placeholder="자세히 보기" />
            <TextInput label="링크 주소" value={it.linkUrl} onChange={(v) => onChange((x) => void (x.linkUrl = v))} placeholder="https://" />
          </div>
          <Toggle label="처음부터 펼쳐 두기" checked={it.open} onChange={(v) => onChange((x) => void (x.open = v))} />
        </div>
      )}
    </div>
  )
}

function LocationEditor({ id }: { id: string }) {
  const { s, set } = useSection<'location'>(id)
  const { toast, draft, update } = useEditor()
  const [finding, setFinding] = useState(false)
  async function geocode() {
    if (!s.address) return
    setFinding(true)
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=${encodeURIComponent(s.address)}`, {
        headers: { 'Accept-Language': 'ko' },
      })
      const j = (await r.json()) as { lat: string; lon: string }[]
      if (!j[0]) throw new Error('주소로 좌표를 찾지 못했어요. 지도 앱에서 좌표를 확인해 직접 입력해 주세요.')
      set((x) => {
        x.lat = Number(Number(j[0].lat).toFixed(6))
        x.lng = Number(Number(j[0].lon).toFixed(6))
      })
      toast('좌표를 찾았어요. 지도 미리보기를 확인해 주세요.')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setFinding(false)
    }
  }
  return (
    <>
      <Group title="예식장">
        <TitleFields s={s} set={set as never} />
        <TextInput label="예식장 이름" value={s.venueName} onChange={(v) => set((x) => void (x.venueName = v))} />
        <TextInput label="홀 이름" value={s.hallName} onChange={(v) => set((x) => void (x.hallName = v))} />
        <TextInput label="전체 주소" value={s.address} onChange={(v) => set((x) => void (x.address = v))} hint="주소만 넣으면 네이버지도 · 카카오맵 · 티맵 길찾기 버튼이 자동으로 연결돼요." />
        <TextInput label="전화번호 (선택)" value={s.tel} onChange={(v) => set((x) => void (x.tel = v))} />
      </Group>
      <Group title="지도">
        <Toggle label="지도 미리보기 표시" checked={s.showMap} onChange={(v) => set((x) => void (x.showMap = v))} />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="위도" value={s.lat} onChange={(v) => set((x) => void (x.lat = v))} />
          <NumberInput label="경도" value={s.lng} onChange={(v) => set((x) => void (x.lng = v))} />
        </div>
        <Btn onClick={geocode} disabled={finding || !s.address}>
          {finding ? '찾는 중…' : '주소로 좌표 찾기'}
        </Btn>
        <Slider label="지도 확대" min={12} max={19} value={s.mapZoom} onChange={(v) => set((x) => void (x.mapZoom = v))} />
        <TextInput
          label="카카오맵 JavaScript 키 (선택)"
          value={draft.maps.kakaoJsKey}
          onChange={(v) => update((d) => void (d.maps.kakaoJsKey = v.trim()))}
          hint="입력하면 카카오 지도로 표시돼요 (developers.kakao.com 에서 사이트 도메인 등록 필요). 비워 두면 OpenStreetMap 지도가 표시됩니다. 네이버지도·카카오맵·티맵 길찾기 버튼은 키 없이 주소만으로 항상 동작해요."
        />
      </Group>
      <Group
        title="식사 · 추가 안내"
        action={
          <Btn onClick={() => set((x) => void x.items.push({ id: uid(), title: '새 안내', body: '', image: null, linkLabel: '', linkUrl: '', open: false }))}>
            {Icon.plus} 항목 추가
          </Btn>
        }
      >
        <TextInput label="안내 영역 제목" value={s.infoTitle} onChange={(v) => set((x) => void (x.infoTitle = v))} />
        <SortableList
          items={s.items}
          onReorder={(next) => set((x) => void (x.items = next))}
          className="space-y-2"
          render={(it, _i, handle) => (
            <InfoItemEditor
              it={it}
              handle={handle}
              onChange={(fn) => set((x) => fn(x.items.find((y) => y.id === it.id)!))}
              onRemove={() => confirm(`'${it.title}' 항목을 삭제할까요?`) && set((x) => void (x.items = x.items.filter((y) => y.id !== it.id)))}
            />
          )}
        />
      </Group>
    </>
  )
}

function AccountsEditor({ title, list, onChange }: { title: string; list: Account[]; onChange: (next: Account[]) => void }) {
  const patch = (id: string, k: keyof Account, v: string) => onChange(list.map((a) => (a.id === id ? { ...a, [k]: v } : a)))
  return (
    <div className="space-y-2">
      <SortableList
        items={list}
        onReorder={onChange}
        className="space-y-2"
        render={(a, _i, handle) => (
          <div className="rounded-lg bg-stone-50 p-2">
            <div className="mb-2 flex items-center gap-1">
              {handle}
              <input className="min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[12px]" value={a.label} placeholder="구분 (예: 신랑 아버지)" onChange={(e) => patch(a.id, 'label', e.target.value)} />
              <button type="button" className="rounded p-1 text-stone-400 hover:text-red-600" onClick={() => onChange(list.filter((x) => x.id !== a.id))} title="삭제">
                {Icon.trash}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[12px]" value={a.bank} placeholder="은행명" onChange={(e) => patch(a.id, 'bank', e.target.value)} />
              <input className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[12px]" value={a.holder} placeholder="예금주" onChange={(e) => patch(a.id, 'holder', e.target.value)} />
              <input className="col-span-2 rounded-md border border-stone-200 bg-white px-2 py-1 font-mono text-[12px]" value={a.number} placeholder="계좌번호" onChange={(e) => patch(a.id, 'number', e.target.value)} />
              <input className="col-span-2 rounded-md border border-stone-200 bg-white px-2 py-1 text-[12px]" value={a.kakaoPayUrl} placeholder="카카오페이 송금 링크 (선택, https://qr.kakaopay.com/…)" onChange={(e) => patch(a.id, 'kakaoPayUrl', e.target.value)} />
            </div>
          </div>
        )}
      />
      <Btn onClick={() => onChange([...list, { id: uid(), label: '', holder: '', bank: '', number: '', kakaoPayUrl: '' }])}>
        {Icon.plus} {title} 계좌 추가
      </Btn>
    </div>
  )
}

function GratitudeEditor({ id }: { id: string }) {
  const { s, set } = useSection<'gratitude'>(id)
  return (
    <>
      <Group title="안내">
        <TitleFields s={s} set={set as never} />
        <TextArea label="설명" value={s.description} rows={3} onChange={(v) => set((x) => void (x.description = v))} />
      </Group>
      <Group title="신랑측">
        <TextInput label="그룹 제목" value={s.groomTitle} onChange={(v) => set((x) => void (x.groomTitle = v))} />
        <AccountsEditor title="신랑측" list={s.groomAccounts} onChange={(n) => set((x) => void (x.groomAccounts = n))} />
      </Group>
      <Group title="신부측">
        <TextInput label="그룹 제목" value={s.brideTitle} onChange={(v) => set((x) => void (x.brideTitle = v))} />
        <AccountsEditor title="신부측" list={s.brideAccounts} onChange={(n) => set((x) => void (x.brideAccounts = n))} />
      </Group>
    </>
  )
}

function GuestbookEditor({ id }: { id: string }) {
  const { s, set } = useSection<'guestbook'>(id)
  return (
    <Group title="축하글">
      <p className="rounded-lg bg-stone-50 px-3 py-2 text-[11.5px] text-stone-500">작성 허용/공개 여부와 글 관리는 상단 ‘축하글’ 메뉴에서 할 수 있어요 (게시 없이 즉시 적용).</p>
      <TitleFields s={s} set={set as never} />
      <TextArea label="설명" value={s.description} rows={2} onChange={(v) => set((x) => void (x.description = v))} />
      <TextInput label="입력창 안내 문구" value={s.placeholder} onChange={(v) => set((x) => void (x.placeholder = v))} />
      <NumberInput label="한 번에 보여줄 글 수" value={s.pageSize} min={3} max={50} onChange={(v) => set((x) => void (x.pageSize = v ?? 10))} />
      <TextInput label="작성 중지 시 문구" value={s.disabledText} onChange={(v) => set((x) => void (x.disabledText = v))} />
    </Group>
  )
}

function PhotographerEditor({ id }: { id: string }) {
  const { s, set } = useSection<'photographer'>(id)
  return (
    <Group title="하객 사진">
      <p className="rounded-lg bg-stone-50 px-3 py-2 text-[11.5px] text-stone-500">업로드 허용, 승인, 다운로드는 상단 ‘하객 사진’ 메뉴에서 관리해요.</p>
      <TitleFields s={s} set={set as never} />
      <TextArea label="설명" value={s.description} rows={2} onChange={(v) => set((x) => void (x.description = v))} />
      <TextArea label="개인정보 수집·이용 동의 문구" value={s.consentText} rows={4} onChange={(v) => set((x) => void (x.consentText = v))} />
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="한 번에 최대 장수" value={s.maxFiles} min={1} max={50} onChange={(v) => set((x) => void (x.maxFiles = v ?? 20))} />
        <NumberInput label="장당 최대 MB" value={s.maxSizeMb} min={1} max={15} onChange={(v) => set((x) => void (x.maxSizeMb = v ?? 15))} />
      </div>
      <TextInput label="업로드 완료 문구" value={s.doneText} onChange={(v) => set((x) => void (x.doneText = v))} />
      <TextInput label="업로드 중지 시 문구" value={s.disabledText} onChange={(v) => set((x) => void (x.disabledText = v))} />
    </Group>
  )
}

function ThankYouEditor({ id }: { id: string }) {
  const { s, set } = useSection<'thankyou'>(id)
  return (
    <>
    <Group title="마지막 인사">
      <TextInput label="필기체 문구" value={s.script} onChange={(v) => set((x) => void (x.script = v))} />
      <TextArea label="감사 메시지" value={s.message} rows={4} onChange={(v) => set((x) => void (x.message = v))} />
      <Toggle label="신랑·신부 이름 표시" checked={s.showNames} onChange={(v) => set((x) => void (x.showNames = v))} />
      <Toggle label="결혼 날짜 표시" checked={s.showDate} onChange={(v) => set((x) => void (x.showDate = v))} />
      <Segmented
        label="배경 효과"
        value={s.effect}
        onChange={(v) => set((x) => void (x.effect = v))}
        options={[
          { value: 'petals', label: '꽃잎' },
          { value: 'light', label: '빛' },
          { value: 'none', label: '없음' },
        ]}
      />
    </Group>
    <Group title="배경 사진">
      <ImageField label="배경 사진 (선택)" value={s.bgPhoto} aspect="9:16" onChange={(v) => set((x) => void (x.bgPhoto = v))} />
      {s.bgPhoto && (
        <>
          <Slider label="흐림" min={0} max={40} value={s.bgBlur} onChange={(v) => set((x) => void (x.bgBlur = v))} format={(n) => (n === 0 ? '선명하게' : `${n}px`)} />
          <Slider label="사진 진하기" min={0.1} max={1} step={0.05} value={s.bgOpacity} onChange={(v) => set((x) => void (x.bgOpacity = v))} format={(n) => `${Math.round(n * 100)}%`} />
          <p className="text-[11px] text-stone-400">글씨가 잘 안 보이면 흐림을 높이거나 진하기를 낮춰 보세요.</p>
        </>
      )}
    </Group>
    </>
  )
}

function TextEditor({ id }: { id: string }) {
  const { s, set } = useSection<'text'>(id)
  return (
    <Group title="자유 텍스트">
      <TitleFields s={s} set={set as never} />
      <TextArea label="본문" value={s.body} rows={6} onChange={(v) => set((x) => void (x.body = v))} />
      <ImageField label="이미지 (선택)" value={s.image} aspect={s.aspect} onChange={(v) => set((x) => void (x.image = v))} onAspectChange={(a) => set((x) => void (x.aspect = a))} />
    </Group>
  )
}

function GreetingEditor({ id }: { id: string }) {
  const { s, set } = useSection<'greeting'>(id)
  return (
    <Group title="초대 글 + 사진">
      <TextInput label="영문 제목" value={s.eyebrow} onChange={(v) => set((x) => void (x.eyebrow = v))} />
      <TextInput label="제목" value={s.title} onChange={(v) => set((x) => void (x.title = v))} />
      <TextArea label="초대 글" value={s.body} rows={8} onChange={(v) => set((x) => void (x.body = v))} hint="줄바꿈한 그대로 보여요." />
      <ImageField label="사진" value={s.photo} aspect={s.aspect} onChange={(v) => set((x) => void (x.photo = v))} onAspectChange={(a) => set((x) => void (x.aspect = a))} />
      <Select label="사진 비율" value={s.aspect} onChange={(v) => set((x) => void (x.aspect = v))} options={ASPECTS} />
      <Slider label="모서리 둥글기" min={0} max={60} value={s.radius} onChange={(v) => set((x) => void (x.radius = v))} format={(n) => `${n}px`} />
      <TextInput label="사진 아래 문구 (선택)" value={s.caption} onChange={(v) => set((x) => void (x.caption = v))} />
    </Group>
  )
}


// ------------------------------------------------------------------ 행사 초대장

function HeroEditor({ id }: { id: string }) {
  const { s, set } = useSection<'hero'>(id)
  return (
    <>
      <Group title="글자">
        <TextInput label="브랜드 (맨 위 기울임 글씨)" value={s.brand} onChange={(v) => set((x) => void (x.brand = v))} />
        <Segmented
          label="브랜드 글꼴"
          value={s.brandFont}
          onChange={(v) => set((x) => void (x.brandFont = v))}
          options={[
            { value: 'serif', label: '굵은 기울임' },
            { value: 'script', label: '필기체' },
            { value: 'sans', label: '고딕' },
          ]}
        />
        <TextArea label="큰 제목" value={s.title} rows={3} onChange={(v) => set((x) => void (x.title = v))} hint="줄바꿈한 그대로 보여요." />
        <Slider label="큰 제목 크기" min={1.4} max={3.4} step={0.05} value={s.titleSize} onChange={(v) => set((x) => void (x.titleSize = v))} format={(n) => `${n.toFixed(2)}rem`} />
        <TextArea label="부제 (한글)" value={s.subtitle} rows={2} onChange={(v) => set((x) => void (x.subtitle = v))} />
        <ColorInput label="부제 색" value={s.subtitleColor} onChange={(v) => set((x) => void (x.subtitleColor = v))} presets={['#7FCB9E', '#6CBC96', '#FFFFFF', '#E9D9A8', '#B7BDDF']} />
      </Group>
      <Group title="배경 그림">
        <ImageField label="배경 그림 (가로 사진 권장)" value={s.bgImage} aspect="4:3" onChange={(v) => set((x) => void (x.bgImage = v))} />
        <Slider label="어둡게" min={0} max={0.7} step={0.05} value={s.overlay} onChange={(v) => set((x) => void (x.overlay = v))} format={(n) => (n === 0 ? '없음' : `${Math.round(n * 100)}%`)} />
        <Slider label="첫 화면 높이" min={36} max={100} value={s.height} onChange={(v) => set((x) => void (x.height = v))} format={(n) => `화면의 ${n}%`} />
        <p className="text-[11px] text-stone-400">배경 그림 아래쪽은 ‘기본 정보 · 전체 디자인’의 바탕색으로 자연스럽게 이어져요. 같은 그림이 상세 페이지 위쪽에도 나와요.</p>
      </Group>
    </>
  )
}

function LetterEditor({ id }: { id: string }) {
  const { s, set } = useSection<'letter'>(id)
  return (
    <Group title="초대 글 카드">
      <TextInput label="영문 제목" value={s.eyebrow} onChange={(v) => set((x) => void (x.eyebrow = v))} />
      <TextArea label="초대 글" value={s.body} rows={11} onChange={(v) => set((x) => void (x.body = v))} hint="빈 줄을 넣으면 문단이 나뉘어요." />
      <Toggle label="반투명 상자로 감싸기" checked={s.boxed} onChange={(v) => set((x) => void (x.boxed = v))} />
    </Group>
  )
}

const ICONS: { value: EventTab['icon']; label: string }[] = [
  { value: 'calendar', label: '달력' },
  { value: 'clock', label: '시계' },
  { value: 'seat', label: '좌석' },
  { value: 'meal', label: '식사' },
  { value: 'pin', label: '위치' },
  { value: 'info', label: '안내' },
]

function ProgramItemsEditor({ items, onChange, addLabel }: { items: ProgramItem[]; onChange: (next: ProgramItem[]) => void; addLabel: string }) {
  const patch = (id: string, k: keyof ProgramItem, v: string) => onChange(items.map((a) => (a.id === id ? { ...a, [k]: v } : a)))
  return (
    <div className="space-y-2">
      <SortableList
        items={items}
        onReorder={onChange}
        className="space-y-1.5"
        render={(it, _i, handle) => (
          <div className="rounded-lg bg-white p-1.5 ring-1 ring-stone-200">
            <div className="flex items-center gap-1">
              {handle}
              <input className="w-[38%] min-w-0 rounded-md border border-stone-200 px-2 py-1 text-[12px]" value={it.time} placeholder="09:30 ~ 10:00" onChange={(e) => patch(it.id, 'time', e.target.value)} />
              <input className="min-w-0 flex-1 rounded-md border border-stone-200 px-2 py-1 text-[12px] font-semibold" value={it.title} placeholder="제목" onChange={(e) => patch(it.id, 'title', e.target.value)} />
              <button type="button" className="rounded p-1 text-stone-400 hover:text-red-600" onClick={() => onChange(items.filter((x) => x.id !== it.id))} title="삭제">
                {Icon.trash}
              </button>
            </div>
            <input className="mt-1 w-full rounded-md border border-stone-200 px-2 py-1 text-[12px]" value={it.desc} placeholder="설명 (선택)" onChange={(e) => patch(it.id, 'desc', e.target.value)} />
          </div>
        )}
      />
      <Btn onClick={() => onChange([...items, { id: uid(), time: '', title: '', desc: '' }])}>
        {Icon.plus} {addLabel}
      </Btn>
    </div>
  )
}

function EventTabEditor({ tab, onChange, onRemove, handle }: { tab: EventTab; onChange: (fn: (t: EventTab) => void) => void; onRemove: () => void; handle: ReactNode }) {
  const [open, setOpen] = useState(false)
  const kindName = tab.kind === 'schedule' ? '일시/장소' : tab.kind === 'program' ? '시간표' : '사진 + 글'
  return (
    <div className="rounded-lg bg-stone-50">
      <div className="flex items-center gap-1 p-1.5">
        {handle}
        <button type="button" className="min-w-0 flex-1 truncate text-left text-[12.5px] text-stone-700" onClick={() => setOpen((o) => !o)}>
          {tab.label || '(이름 없음)'} <span className="text-[10.5px] text-stone-400">· {kindName}</span>
        </button>
        <button type="button" className="rounded p-1 text-stone-400" onClick={() => setOpen((o) => !o)}>
          {open ? Icon.up : Icon.down}
        </button>
        <button type="button" className="rounded p-1 text-stone-400 hover:text-red-600" onClick={onRemove} title="삭제">
          {Icon.trash}
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-stone-200/70 p-3">
          <TextInput label="버튼 이름" value={tab.label} onChange={(v) => onChange((x) => void (x.label = v))} maxLength={16} />
          <Segmented
            label="종류"
            value={tab.kind}
            onChange={(v) => onChange((x) => void (x.kind = v))}
            options={[
              { value: 'schedule', label: '일시/장소' },
              { value: 'program', label: '시간표' },
              { value: 'content', label: '사진 + 글' },
            ]}
          />
          {tab.kind === 'schedule' ? (
            <>
              <p className="rounded-lg bg-white px-3 py-2 text-[11.5px] leading-relaxed text-stone-500">
                날짜·시간·장소·주소는 아래 <b>‘일시 · 장소’</b> 칸에서 한 번만 입력하면 여기와 ‘오시는 길’에 함께 나와요.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <TextInput label="일시 제목" value={tab.dateLabel} onChange={(v) => onChange((x) => void (x.dateLabel = v))} />
                <TextInput label="장소 제목" value={tab.placeLabel} onChange={(v) => onChange((x) => void (x.placeLabel = v))} />
                <TextInput label="주소 제목" value={tab.addressLabel} onChange={(v) => onChange((x) => void (x.addressLabel = v))} />
              </div>
              <TextInput label="길찾기 제목" value={tab.moreLabel} onChange={(v) => onChange((x) => void (x.moreLabel = v))} />
              <TextInput label="길찾기 설명" value={tab.moreText} onChange={(v) => onChange((x) => void (x.moreText = v))} />
              <ImageField label="주소 아래 사진 (선택 · 약도 캡처 등)" value={tab.image} aspect={tab.aspect} onChange={(v) => onChange((x) => void (x.image = v))} onAspectChange={(a) => onChange((x) => void (x.aspect = a))} />
              <TextArea label="추가 안내 글 (선택)" value={tab.body} rows={3} onChange={(v) => onChange((x) => void (x.body = v))} />
            </>
          ) : (
            <>
              <Toggle label="맨 위 아이콘 표시" checked={tab.showIcon} onChange={(v) => onChange((x) => void (x.showIcon = v))} />
              {tab.showIcon && <Select label="아이콘" value={tab.icon} onChange={(v) => onChange((x) => void (x.icon = v))} options={ICONS} />}
              <TextArea label="안내 문장" value={tab.title} rows={2} onChange={(v) => onChange((x) => void (x.title = v))} />
              <ImageField
                label={tab.kind === 'program' ? '사진 (선택)' : '사진 (좌석배치도 · 메뉴 등)'}
                value={tab.image}
                aspect={tab.aspect}
                onChange={(v) => onChange((x) => void (x.image = v))}
                onAspectChange={(a) => onChange((x) => void (x.aspect = a))}
              />
              {tab.image && <Select label="사진 비율" value={tab.aspect} onChange={(v) => onChange((x) => void (x.aspect = v))} options={ASPECTS} />}
              <p className="text-[11px] text-stone-400">하객이 사진을 누르면 크게 확대해서 볼 수 있어요.</p>
              <TextArea label="글" value={tab.body} rows={4} onChange={(v) => onChange((x) => void (x.body = v))} hint="줄바꿈한 그대로 보여요." />
              <div>
                <span className="mb-1.5 block text-[12px] font-medium text-stone-500">{tab.kind === 'program' ? '시간표' : '목록 (선택 · 메뉴 등)'}</span>
                <ProgramItemsEditor items={tab.items} onChange={(n) => onChange((x) => void (x.items = n))} addLabel={tab.kind === 'program' ? '순서 추가' : '항목 추가'} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function EventEditor({ id }: { id: string }) {
  const { s, set } = useSection<'event'>(id)
  const { draft } = useEditor()
  return (
    <>
      <Group
        title="행사 상세 안내 · 버튼"
        action={
          <Btn
            onClick={() =>
              set((x) => {
                const t = defaultEventTabs()[3]
                x.tabs.push({ ...t, id: uid(), label: '새 안내', title: '', body: '' })
              })
            }
          >
            {Icon.plus} 버튼 추가
          </Btn>
        }
      >
        <TextInput label="제목" value={s.title} onChange={(v) => set((x) => void (x.title = v))} />
        <TextArea label="설명" value={s.description} rows={2} onChange={(v) => set((x) => void (x.description = v))} />
        <Segmented
          label="버튼 모양"
          value={s.buttonStyle}
          onChange={(v) => set((x) => void (x.buttonStyle = v))}
          options={[
            { value: 'mixed', label: '테두리 + 채움' },
            { value: 'filled', label: '모두 채움' },
            { value: 'outline', label: '모두 테두리' },
          ]}
        />
        <p className="text-[11px] text-stone-400">버튼은 2칸씩 배치돼요. 누르면 상세 페이지가 열려요 (미리보기에서도 눌러 볼 수 있어요).</p>
        <SortableList
          items={s.tabs}
          onReorder={(next) => set((x) => void (x.tabs = next))}
          className="space-y-2"
          render={(tab, _i, handle) => (
            <EventTabEditor
              tab={tab}
              handle={handle}
              onChange={(fn) => set((x) => fn(x.tabs.find((y) => y.id === tab.id)!))}
              onRemove={() => confirm(`'${tab.label}' 버튼을 삭제할까요?`) && set((x) => void (x.tabs = x.tabs.filter((y) => y.id !== tab.id)))}
            />
          )}
        />
      </Group>
      <Group title="일시 · 장소">
        <p className="rounded-lg bg-stone-50 px-3 py-2 text-[11.5px] leading-relaxed text-stone-500">
          날짜는 <b>기본 정보 · 전체 디자인</b>의 날짜({draft.wedding.date})를 그대로 써요. 다르게 쓰고 싶을 때만 아래에 직접 입력하세요.
        </p>
        <TextInput label="날짜 글 (비우면 자동)" value={s.dateText} placeholder="2026년 10월 19일 월요일" onChange={(v) => set((x) => void (x.dateText = v))} />
        <TextInput label="시간 글 (비우면 자동)" value={s.timeText} placeholder="오전 10시 ~ 오전 11시" onChange={(v) => set((x) => void (x.timeText = v))} />
        <TextInput label="장소 이름" value={s.venueName} onChange={(v) => set((x) => void (x.venueName = v))} />
        <TextInput
          label="주소"
          value={s.address}
          placeholder="예: 강원특별자치도 강릉시 …"
          onChange={(v) => set((x) => void (x.address = v))}
          hint="주소만 넣으면 네이버지도 · 카카오맵 · 티맵 길찾기 버튼이 자동으로 연결돼요. 휴대폰에서는 앱이 바로 열리고, 앱이 없으면 웹 지도(티맵은 설치 화면)로 넘어가요."
        />
      </Group>
      <Group title="오시는 길">
        <Toggle label="길찾기 버튼 표시" checked={s.showDirections} onChange={(v) => set((x) => void (x.showDirections = v))} />
        <TextInput label="제목" value={s.mapTitle} onChange={(v) => set((x) => void (x.mapTitle = v))} />
        <TextInput label="설명" value={s.mapDescription} onChange={(v) => set((x) => void (x.mapDescription = v))} />
      </Group>
      <Group title="카드 · 맨 아래 로고">
        <div className="grid grid-cols-2 gap-2">
          <ColorInput label="카드 색" value={s.cardColor} onChange={(v) => set((x) => void (x.cardColor = v))} presets={['#FFFFFF', '#F7F7F5', '#F4F0E8']} />
          <ColorInput label="카드 글자색" value={s.cardTextColor} onChange={(v) => set((x) => void (x.cardTextColor = v))} presets={['#1A1A1A', '#333333', '#514A43']} />
        </div>
        <TextInput label="맨 아래 글자 로고" value={s.footerText} onChange={(v) => set((x) => void (x.footerText = v))} />
        <ColorInput label="글자 로고 색" value={s.footerColor} onChange={(v) => set((x) => void (x.footerColor = v))} presets={['#1F3C98', '#151C5C', '#6CBC96']} />
        <ImageField label="로고 이미지 (넣으면 글자 대신 표시)" value={s.footerImage} aspect="original" onChange={(v) => set((x) => void (x.footerImage = v))} />
        <p className="text-[11px] text-stone-400">버튼 · 강조 색은 ‘기본 정보 · 전체 디자인’의 포인트 색을 따라가요.</p>
      </Group>
    </>
  )
}

const EDITORS: Record<SectionType, (p: { id: string }) => ReactNode> = {
  envelope: EnvelopeEditor,
  main: MainEditor,
  story: StoryEditor,
  calendar: CalendarEditor,
  gallery: GalleryEditor,
  location: LocationEditor,
  gratitude: GratitudeEditor,
  guestbook: GuestbookEditor,
  photographer: PhotographerEditor,
  thankyou: ThankYouEditor,
  text: TextEditor,
  greeting: GreetingEditor,
  hero: HeroEditor,
  letter: LetterEditor,
  event: EventEditor,
}

export function SectionInspector({ section }: { section: Section }) {
  const [tab, setTab] = useState<'content' | 'style'>('content')
  const E = EDITORS[section.type]
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <p className="text-[11px] text-stone-400">{SECTION_META[section.type].name}</p>
        <p className="mb-3 text-[15px] font-semibold text-stone-800">{section.label}</p>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'content', label: '내용' },
            { value: 'style', label: section.type === 'envelope' ? '페이지' : '스타일 · 애니메이션' },
          ]}
        />
      </div>
      {tab === 'content' ? <E id={section.id} /> : <StylePanel id={section.id} />}
    </div>
  )
}
