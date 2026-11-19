import { hasPlace, openMap, type MapApp, type Place } from '../../lib/maps'
import { copyText } from '../../lib/util'
import { useInvite } from '../context'

const APPS: { app: MapApp; label: string; color: string }[] = [
  { app: 'naver', label: '네이버지도', color: '#03C75A' },
  { app: 'kakao', label: '카카오맵', color: '#FEE500' },
  { app: 'tmap', label: '티맵', color: '#E4002B' },
]

/** 네이버지도 · 카카오맵 · 티맵 길찾기 + 주소 복사. 주소를 넣기 전에는 안내 문구만 보여요. */
export function MapButtons({ place, copy = true, className = '' }: { place: Place; copy?: boolean; className?: string }) {
  const { toast, flags } = useInvite()
  if (!hasPlace(place)) {
    return flags.preview ? (
      <p className={`rounded-xl border border-dashed px-4 py-3 text-[0.78rem] ${className}`} style={{ borderColor: 'var(--c-accent)', color: 'var(--c-muted)' }}>
        ‘오시는 길’에 주소를 입력하면 길찾기 버튼이 자동으로 생겨요
      </p>
    ) : null
  }
  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-2 text-[0.8rem]">
        {APPS.map((a) => (
          <button
            key={a.app}
            type="button"
            className="tap soft-card flex min-h-[46px] items-center justify-center gap-1.5 px-2"
            onClick={() => {
              if (!openMap(place, a.app)) toast('티맵은 휴대폰에서 열 수 있어요')
            }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color, boxShadow: '0 0 0 1px rgba(0,0,0,.06)' }} />
            {a.label}
          </button>
        ))}
      </div>
      {copy && place.address && (
        <button
          type="button"
          className="tap mt-3 inline-flex items-center gap-1.5 text-[0.76rem] underline-offset-4 hover:underline"
          style={{ color: 'var(--c-muted)' }}
          onClick={async () => toast((await copyText(place.address)) ? '주소가 복사되었어요' : '복사에 실패했어요')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h8" />
          </svg>
          주소 복사
        </button>
      )}
    </div>
  )
}
