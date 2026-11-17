import type {
  InvitationContent,
  Section,
  SectionStyle,
  SectionType,
  SettingsOf,
  Account,
  InfoItem,
  GalleryPhoto,
} from './types'
import { uid } from './util'

export const DEFAULT_SLUG = import.meta.env.VITE_DEFAULT_SLUG || 'our-wedding'

export const PALETTE = {
  bg: '#FAF9F6',
  bg2: '#F4F0E8',
  text: '#514A43',
  accent: '#B8A489',
  sage: '#BCC6B2',
  wax: '#A86B69',
  muted: '#9C948B',
}

export const SECTION_META: Record<SectionType, { name: string; label: string; singleton?: boolean; fixed?: boolean }> = {
  envelope: { name: 'The Invitation · 봉투', label: 'Invitation', singleton: true, fixed: true },
  main: { name: 'Wedding Main · 메인', label: 'Main' },
  story: { name: 'Our Story · 소개 & D-day', label: 'Story' },
  calendar: { name: 'Save the Date · 달력', label: 'Date' },
  gallery: { name: 'Our Moments · 앨범', label: 'Gallery' },
  location: { name: 'Location · 오시는 길', label: 'Location' },
  gratitude: { name: 'With Gratitude · 마음 전하실 곳', label: 'Gift' },
  guestbook: { name: 'Guestbook · 축하글', label: 'Guestbook' },
  photographer: { name: 'Photographer · 하객 사진', label: 'Photos' },
  thankyou: { name: 'Thank You · 마지막 인사', label: 'Thanks' },
  text: { name: 'Text · 자유 텍스트', label: 'Note' },
  greeting: { name: 'Invitation · 초대 글 + 사진', label: 'Invitation' },
}

export function defaultStyle(overrides: Partial<SectionStyle> = {}): SectionStyle {
  return {
    paddingTop: 72,
    paddingBottom: 72,
    align: 'center',
    background: 'bg',
    titleScale: 1,
    bodyScale: 1,
    fitScreen: true,
    animation: { enabled: true, type: 'slide-up', duration: 0.9 },
    ...overrides,
  }
}

export function sampleImage(n: number) {
  return { url: `/samples/spring-${n}.svg`, width: 1200, height: n % 3 === 0 ? 900 : 1600, focusX: 50, focusY: 50, zoom: 1 }
}

const account = (label: string, holder: string, bank: string, number: string): Account => ({
  id: uid(),
  label,
  holder,
  bank,
  number,
  kakaoPayUrl: '',
})

const info = (title: string, body: string, open = false): InfoItem => ({
  id: uid(),
  title,
  body,
  image: null,
  linkLabel: '',
  linkUrl: '',
  open,
})

export function defaultSettings<T extends SectionType>(type: T): SettingsOf<T> {
  const map: { [K in SectionType]: () => SettingsOf<K> } = {
    envelope: () => ({
      envelopeColor: '#F7F3EC',
      liningColor: '#EFE8DC',
      texture: 'cotton',
      waxColor: PALETTE.wax,
      waxEmblem: 'initials',
      waxInitials: 'H & S',
      speed: 1,
      hint: 'tap the seal to open',
      cardText: 'You are invited',
      showOnEveryVisit: true,
      startView: 'closeup',
    }),
    main: () => ({
      namesEn: 'hyeryeon & sunghwan',
      dateText: '',
      fromText: 'from. 혜련 and 승환',
      photo: sampleImage(1),
      aspect: '3:4',
      photoRadius: 0,
      photoShape: 'oval',
      bgPhoto: true,
      bgOpacity: 0.35,
      bgBlur: 16,
      namesSize: 2.6,
    }),
    story: () => ({
      eyebrow: 'OUR STORY',
      title: '저희 두 사람을 소개합니다',
      groom: {
        role: '신랑',
        nameKo: '승환',
        nameEn: 'Sunghwan',
        intro: '따뜻한 웃음으로\n하루를 밝혀 주는 사람',
        photo: sampleImage(4),
        parents: '아버지 · 어머니의 아들',
        phone: '',
      },
      bride: {
        role: '신부',
        nameKo: '혜련',
        nameEn: 'Hyeryeon',
        intro: '봄볕처럼 다정하게\n곁을 지켜 주는 사람',
        photo: sampleImage(5),
        parents: '아버지 · 어머니의 딸',
        phone: '',
      },
      order: 'groom-first',
      photoShape: 'circle',
      countdownEyebrow: 'WEDDING DAY',
      countdownTitle: '저희의 결혼식까지',
      countdownMode: 'both',
      afterText: 'Our Wedding Day',
      showCountdown: true,
    }),
    calendar: () => ({
      eyebrow: 'SAVE THE DATE',
      title: '',
      heartStyle: 'heart',
      highlightColor: PALETTE.wax,
      showWeekNumbersInKorean: false,
      weekStart: 'sun',
      timeText: '',
      note: '',
    }),
    gallery: () => ({
      eyebrow: 'OUR MOMENTS',
      title: '우리의 순간들',
      layout: 'carousel',
      carouselAspect: '4:5',
      columns: 3,
      initialCount: 9,
      photos: [1, 2, 3, 4, 5, 6].map<GalleryPhoto>((n) => ({ id: uid(), image: sampleImage(n), caption: '' })),
    }),
    location: () => ({
      eyebrow: 'LOCATION',
      title: '오시는 길',
      venueName: '봄빛 웨딩홀',
      hallName: '3층 가든홀',
      address: '서울특별시 중구 세종대로 110',
      tel: '',
      lat: 37.5663,
      lng: 126.9779,
      showMap: true,
      mapZoom: 16,
      infoTitle: '안내',
      items: [
        info('식사 안내', '예식 후 같은 건물 2층 연회장에서\n뷔페로 식사가 준비되어 있습니다.', false),
        info('주차 안내', '건물 지하 주차장을 2시간 무료로 이용하실 수 있습니다.'),
        info('대중교통 안내', '지하철 1·2호선 시청역 5번 출구 도보 3분'),
      ],
    }),
    gratitude: () => ({
      eyebrow: 'WITH GRATITUDE',
      title: '마음 전하실 곳',
      description: '참석이 어려우신 분들을 위해\n계좌번호를 기재하였습니다.\n너그러운 마음으로 양해 부탁드립니다.',
      groomTitle: '신랑측 계좌번호',
      brideTitle: '신부측 계좌번호',
      groomAccounts: [account('신랑', '승환', '은행명', '000-0000-0000-00')],
      brideAccounts: [account('신부', '혜련', '은행명', '000-0000-0000-00')],
    }),
    guestbook: () => ({
      eyebrow: 'GUESTBOOK',
      title: '축하의 마음을 남겨 주세요',
      description: '따뜻한 한마디가 오래도록 기억될 거예요.',
      placeholder: '두 분의 앞날을 축복합니다.',
      pageSize: 10,
      disabledText: '지금은 축하글 작성이 잠시 닫혀 있어요.',
    }),
    photographer: () => ({
      eyebrow: 'OUR WEDDING THROUGH YOUR EYES',
      title: '오늘의 사진작가',
      description: '여러분의 시선으로 담아 주신 오늘을\n저희에게 나누어 주세요.',
      consentText:
        '업로드한 사진은 신랑·신부가 확인한 후 이 청첩장에 공개될 수 있습니다. 사진에 다른 분의 얼굴이 포함될 수 있음을 확인하였으며, 이름·메시지와 함께 저장되는 것에 동의합니다.',
      maxFiles: 20,
      maxSizeMb: 15,
      disabledText: '지금은 사진 업로드가 잠시 닫혀 있어요.',
      doneText: '소중한 사진 감사합니다! 확인 후 공개될 예정이에요.',
    }),
    thankyou: () => ({
      script: 'Thank you',
      message: '저희의 소중한 시작을\n함께해 주셔서 감사합니다.',
      showNames: true,
      showDate: true,
      effect: 'petals',
    }),
    greeting: () => ({
      eyebrow: 'INVITATION',
      title: '소중한 분들을 초대합니다',
      body: '서로가 마주보며 다져온 사랑을\n이제 함께 한 곳을 바라보며\n걸어갈 수 있는 큰 사랑으로 키우고자 합니다.\n\n저희 두 사람이 사랑의 이름으로\n지켜나갈 수 있게 앞날을\n축복해 주시면 감사하겠습니다.',
      photo: sampleImage(2),
      aspect: '4:5',
      radius: 22,
      caption: '',
    }),
    text: () => ({
      eyebrow: 'NOTICE',
      title: '알려드립니다',
      body: '이곳에 자유롭게 내용을 작성해 주세요.',
      image: null,
      aspect: '4:5',
    }),
  }
  return map[type]() as SettingsOf<T>
}

export function createSection<T extends SectionType>(type: T, label?: string): Section {
  const styleByType: Partial<Record<SectionType, Partial<SectionStyle>>> = {
    envelope: { fitScreen: true, animation: { enabled: true, type: 'fade', duration: 1 } },
    main: { paddingTop: 56, paddingBottom: 56, animation: { enabled: true, type: 'fade', duration: 1.4 } },
    story: { background: 'bg' },
    calendar: { background: 'bg2' },
    gallery: { background: 'bg', fitScreen: false },
    location: { background: 'bg2', fitScreen: false },
    gratitude: { background: 'bg', fitScreen: false },
    guestbook: { background: 'bg2', fitScreen: false },
    photographer: { background: 'bg', fitScreen: false },
    thankyou: { background: 'bg', animation: { enabled: true, type: 'fade', duration: 1.6 } },
    text: { fitScreen: false },
    greeting: { background: 'bg', fitScreen: false },
  }
  return {
    id: uid(),
    type,
    label: label ?? SECTION_META[type].label,
    hidden: false,
    style: defaultStyle(styleByType[type]),
    settings: defaultSettings(type),
  } as Section
}

export function defaultContent(): InvitationContent {
  return {
    schemaVersion: 1,
    theme: {
      colors: { ...PALETTE },
      fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', sans: 'Pretendard' },
      baseFontSize: 15,
      letterSpacing: 0,
    },
    wedding: { date: '2027-05-15', time: '12:30', timezone: 'Asia/Seoul' },
    couple: { groomKo: '승환', brideKo: '혜련', groomEn: 'Sunghwan', brideEn: 'Hyeryeon' },
    nav: { enabled: true, position: 'right', showLabels: false },
    animation: { enabled: true, speed: 1 },
    share: {
      title: '혜련 ♥ 승환 결혼합니다',
      description: '2027년 5월 15일 토요일 오후 12시 30분\n봄빛 웨딩홀',
      image: null,
      kakaoJsKey: '',
      buttonText: '모바일 청첩장 보기',
    },
    maps: { kakaoJsKey: '' },
    sections: (
      ['envelope', 'main', 'story', 'calendar', 'gallery', 'location', 'gratitude', 'guestbook', 'photographer', 'thankyou'] as SectionType[]
    ).map((t) => createSection(t)),
  }
}
