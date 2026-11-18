// 청첩장 콘텐츠 모델 — 관리자 초안(draft)과 게시본(published)이 같은 형태로 DB(jsonb)에 저장됩니다.

export type SectionType =
  | 'envelope'
  | 'main'
  | 'story'
  | 'calendar'
  | 'gallery'
  | 'location'
  | 'gratitude'
  | 'guestbook'
  | 'photographer'
  | 'thankyou'
  | 'text'
  | 'greeting'

export type Aspect = 'original' | '1:1' | '4:5' | '3:4' | '2:3' | '3:5' | '9:16' | '4:3' | '3:2' | '16:9'

/** 이미지 참조. path 는 media 버킷 경로, url 은 외부 이미지. crop 은 비파괴 크롭(초점·확대). */
export interface ImageRef {
  path?: string
  url?: string
  width?: number
  height?: number
  focusX?: number // 0~100 (%)
  focusY?: number // 0~100 (%)
  zoom?: number // 1~3
  alt?: string
}

export type AnimationType = 'fade' | 'slide-up' | 'zoom' | 'none'

export interface SectionStyle {
  paddingTop: number // px
  paddingBottom: number // px
  align: 'left' | 'center' | 'right'
  background: 'bg' | 'bg2' | 'custom'
  customBackground?: string
  titleScale: number // 0.7~1.6
  bodyScale: number // 0.8~1.4
  textColor?: string
  fitScreen: boolean // 화면 1개 높이를 최소 높이로
  animation: { enabled: boolean; type: AnimationType; duration: number } // duration 초
}

interface SectionBase<T extends SectionType, S> {
  id: string
  type: T
  label: string // 내비게이션 표시 이름
  hidden: boolean
  style: SectionStyle
  settings: S
}

export interface EnvelopeSettings {
  envelopeColor: string
  liningColor: string
  texture: 'smooth' | 'linen' | 'cotton' | 'felt'
  waxColor: string
  waxEmblem: 'initials' | 'heart' | 'flower'
  waxInitials: string
  speed: number // 0.5(느리게) ~ 2(빠르게)
  hint: string
  cardText: string
  showOnEveryVisit: boolean
  envStyle: 'classic' | 'pearl' | 'gate' // 클래식 / 진주(곡선 덮개) / 리본(양문형 + 새틴 리본 끈)
  ribbonColor: string // 양문형 봉투의 리본 색
  pearlTopText: string
  pearlDots: boolean // 작은 진주 흩뿌리기
  pearlClosure: 'pearl' | 'seal' // 가운데 장식: 진주 한 알 / 실링왁스
  closure: 'seal' | 'bow' // (이전 설정 호환)
  bowColor: string
  outlineColor: string // 봉투 테두리 선 색 (비우면 선 없음)
  startView: 'closeup' | 'full' // 시작 화면: 실링 클로즈업 / 봉투 전체
}

export interface MainSettings {
  namesEn: string
  dateText: string // 비우면 결혼 날짜로 자동 생성
  fromText: string
  photo: ImageRef | null
  aspect: Aspect
  photoRadius: number
  photoShape: 'oval' | 'rect' // 긴 타원형 / 사각형
  bgPhoto: boolean // 배경에 같은 사진을 은은하게
  bgOpacity: number // 0~1
  bgBlur: number // px
  namesSize: number // rem
}

export interface PersonProfile {
  role: string // '신랑' / '신부'
  nameKo: string
  nameEn: string
  intro: string
  photo: ImageRef | null
  parents: string // 예: '김철수 · 이영희의 장남'
  phone: string
}

export interface StorySettings {
  eyebrow: string
  title: string
  groom: PersonProfile
  bride: PersonProfile
  order: 'groom-first' | 'bride-first'
  photoShape: 'circle' | 'rounded'
  countdownEyebrow: string
  countdownTitle: string
  countdownMode: 'dday' | 'full' | 'both'
  afterText: string
  showCountdown: boolean
}

export interface CalendarSettings {
  eyebrow: string
  title: string
  heartStyle: 'heart' | 'heart-outline' | 'circle' | 'ring'
  highlightColor: string
  showWeekNumbersInKorean: boolean
  weekStart: 'sun' | 'mon'
  timeText: string // 비우면 자동
  note: string
}

export interface GalleryPhoto {
  id: string
  image: ImageRef
  caption: string
}

export interface GallerySettings {
  eyebrow: string
  title: string
  layout: 'carousel' | 'grid' | 'slide' | 'editorial'
  carouselAspect: Aspect // 큰 사진 비율 (슬라이드+썸네일)
  columns: 2 | 3
  photos: GalleryPhoto[]
  initialCount: number // 처음 보여줄 사진 수 (나머지는 더보기)
}

export interface InfoItem {
  id: string
  title: string
  body: string
  image: ImageRef | null
  linkLabel: string
  linkUrl: string
  open: boolean
}

export interface LocationSettings {
  eyebrow: string
  title: string
  venueName: string
  hallName: string
  address: string
  tel: string
  lat: number | null
  lng: number | null
  showMap: boolean
  mapZoom: number
  infoTitle: string
  items: InfoItem[]
}

export interface Account {
  id: string
  label: string // 구분 (신랑, 신랑 아버지 ...)
  holder: string
  bank: string
  number: string
  kakaoPayUrl: string
}

export interface GratitudeSettings {
  eyebrow: string
  title: string
  description: string
  groomTitle: string
  brideTitle: string
  groomAccounts: Account[]
  brideAccounts: Account[]
}

export interface GuestbookSettings {
  eyebrow: string
  title: string
  description: string
  placeholder: string
  pageSize: number
  disabledText: string
}

export interface PhotographerSettings {
  eyebrow: string
  title: string
  description: string
  consentText: string
  maxFiles: number
  maxSizeMb: number
  disabledText: string
  doneText: string
}

export interface ThankYouSettings {
  script: string
  message: string
  showNames: boolean
  showDate: boolean
  effect: 'petals' | 'light' | 'none'
  bgPhoto: ImageRef | null // 배경 사진
  bgBlur: number // px
  bgOpacity: number // 0~1 (사진이 보이는 정도)
}

export interface GreetingSettings {
  eyebrow: string // INVITATION
  title: string // 소중한 분들을 초대합니다
  body: string
  photo: ImageRef | null
  aspect: Aspect
  radius: number // 사진 모서리 둥글기(px)
  caption: string // 사진 아래 문구 (선택)
}

export interface TextSettings {
  eyebrow: string
  title: string
  body: string
  image: ImageRef | null
  aspect: Aspect
}

export type Section =
  | SectionBase<'envelope', EnvelopeSettings>
  | SectionBase<'main', MainSettings>
  | SectionBase<'story', StorySettings>
  | SectionBase<'calendar', CalendarSettings>
  | SectionBase<'gallery', GallerySettings>
  | SectionBase<'location', LocationSettings>
  | SectionBase<'gratitude', GratitudeSettings>
  | SectionBase<'guestbook', GuestbookSettings>
  | SectionBase<'photographer', PhotographerSettings>
  | SectionBase<'thankyou', ThankYouSettings>
  | SectionBase<'text', TextSettings>
  | SectionBase<'greeting', GreetingSettings>

export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>
export type SettingsOf<T extends SectionType> = SectionOf<T>['settings']

export interface Theme {
  colors: {
    bg: string
    bg2: string
    text: string
    accent: string
    sage: string
    wax: string
    muted: string
  }
  fonts: {
    script: string
    serif: string
    sans: string
  }
  baseFontSize: number // px
  letterSpacing: number // em
}

export interface RsvpSettings {
  enabled: boolean // 봉투가 열린 뒤 참석 여부 팝업 띄우기
  title: string
  description: string
  askSide: boolean
  askPartySize: boolean
  askMeal: boolean
  attendMessage: string // 참석 회신 후 문구
  declineMessage: string // 불참 회신 후 문구
  deadline: string // 회신 마감 안내 (선택)
}

export interface InvitationContent {
  schemaVersion: 1
  theme: Theme
  wedding: {
    date: string // 'YYYY-MM-DD'
    time: string // 'HH:mm'
    timezone: string // 'Asia/Seoul'
  }
  couple: {
    groomKo: string
    brideKo: string
    groomEn: string
    brideEn: string
  }
  nav: {
    enabled: boolean
    position: 'right' | 'left'
    showLabels: boolean
  }
  animation: {
    enabled: boolean
    speed: number // 0.5 ~ 2 (배속)
  }
  share: {
    title: string
    description: string
    image: ImageRef | null
    kakaoJsKey: string
    buttonText: string
    /** 게시할 때 만든 링크 미리보기용 가로 사진(1200×630, 정한 위치대로 잘림) */
    ogImagePath?: string
    ogKey?: string
  }
  maps: {
    kakaoJsKey: string
  }
  rsvp: RsvpSettings
  sections: Section[]
}

export interface PublicInvitation {
  /** 축하글·사진이 모이는 기본 청첩장 id */
  id: string
  version_id?: string
  slug: string
  content: InvitationContent
  published_at: string | null
  guestbook_enabled: boolean
  guestbook_public: boolean
  uploads_enabled: boolean
  uploads_public: boolean
  uploads_require_approval: boolean
}

export interface GuestbookEntry {
  id: string
  author: string
  message: string
  created_at: string
  has_password: boolean
}

export interface GuestPhoto {
  id: string
  storage_path: string
  author: string | null
  message: string | null
  width: number | null
  height: number | null
  created_at: string
  url?: string
}

/** 미리보기·실서비스에서 섹션 컴포넌트에 전달되는 실행 컨텍스트 */
export interface RuntimeFlags {
  slug: string
  invitationId: string | null
  guestbookEnabled: boolean
  guestbookPublic: boolean
  uploadsEnabled: boolean
  uploadsPublic: boolean
  uploadsRequireApproval: boolean
  preview: boolean
}
