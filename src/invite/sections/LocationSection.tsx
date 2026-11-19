import { useEffect, useRef, useState } from 'react'
import type { SectionOf } from '../../lib/types'
import { useInvite } from '../context'
import { Accordion } from '../ui/Accordion'
import { MapButtons } from '../ui/MapButtons'
import { Img } from '../ui/Img'
import { Reveal } from '../ui/Reveal'
import { Body, SectionShell, SectionTitle } from '../SectionShell'

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void
        LatLng: new (lat: number, lng: number) => unknown
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => { setDraggable: (b: boolean) => void; setZoomable: (b: boolean) => void }
        Marker: new (opts: Record<string, unknown>) => { setMap: (m: unknown) => void }
      }
    }
    Kakao?: {
      isInitialized: () => boolean
      init: (key: string) => void
      Share: { sendDefault: (o: Record<string, unknown>) => void }
    }
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error('script load failed'))
    document.head.appendChild(el)
  })
}

function KakaoMap({ appKey, lat, lng, level, onFail }: { appKey: string; lat: number; lng: number; level: number; onFail: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    loadScript(`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`)
      .then(() => {
        if (!window.kakao?.maps) throw new Error('no kakao')
        window.kakao.maps.load(() => {
          if (cancelled || !ref.current || !window.kakao) return
          const pos = new window.kakao.maps.LatLng(lat, lng)
          const map = new window.kakao.maps.Map(ref.current, { center: pos, level })
          map.setDraggable(true)
          map.setZoomable(false)
          new window.kakao.maps.Marker({ position: pos }).setMap(map)
        })
      })
      .catch(() => !cancelled && onFail())
    return () => {
      cancelled = true
    }
  }, [appKey, lat, lng, level, onFail])
  return <div ref={ref} className="h-full w-full" />
}

function OsmMap({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const d = 0.0035 * Math.pow(2, 16 - zoom)
  const bbox = [lng - d, lat - d * 0.7, lng + d, lat + d * 0.7].join(',')
  // 지도 아래 ‘문제점 보고 · 저작권’ 줄은 틀 밖으로 잘라 내고, 출처는 지도 아래 작은 글씨로 표시
  return (
    <iframe
      title="예식장 위치 지도"
      className="absolute left-0 top-0 w-full border-0"
      loading="lazy"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
      style={{ height: 'calc(100% + 28px)', filter: 'grayscale(.55) sepia(.12) contrast(.95) brightness(1.03)' }}
    />
  )
}

export function LocationSection({ section, selected }: { section: SectionOf<'location'>; selected?: boolean }) {
  const { content } = useInvite()
  const s = section.settings
  const [kakaoFailed, setKakaoFailed] = useState(false)
  const hasCoords = typeof s.lat === 'number' && typeof s.lng === 'number' && !Number.isNaN(s.lat) && !Number.isNaN(s.lng)
  const name = [s.venueName, s.hallName].filter(Boolean).join(' ')
  const kakaoKey = content.maps.kakaoJsKey?.trim()

  return (
    <SectionShell section={section} selected={selected}>
      {/* 상단: 위치 */}
      <div className="flex min-h-[calc(var(--app-h,100svh)*0.46)] flex-col justify-center">
        <Reveal>
          <SectionTitle eyebrow={s.eyebrow} title={s.title} />
        </Reveal>
        <Reveal delay={0.05}>
          <p className="text-[1.05rem]">{s.venueName}</p>
          {s.hallName && (
            <p className="mt-1 text-[0.9rem]" style={{ color: 'var(--c-muted)' }}>
              {s.hallName}
            </p>
          )}
          <p className="mt-3 text-[0.86rem] leading-relaxed">{s.address}</p>
          {s.tel && (
            <a className="mt-1 inline-block text-[0.82rem] underline-offset-4" style={{ color: 'var(--c-muted)' }} href={`tel:${s.tel.replace(/[^0-9+]/g, '')}`}>
              Tel. {s.tel}
            </a>
          )}
        </Reveal>
        {s.showMap && hasCoords && (
          <Reveal delay={0.12} className="mt-6">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[14px]" style={{ background: 'var(--c-bg2)' }}>
              {kakaoKey && !kakaoFailed ? (
                <KakaoMap appKey={kakaoKey} lat={s.lat!} lng={s.lng!} level={Math.max(1, 20 - s.mapZoom)} onFail={() => setKakaoFailed(true)} />
              ) : (
                <OsmMap lat={s.lat!} lng={s.lng!} zoom={s.mapZoom} />
              )}
            </div>
            {!(kakaoKey && !kakaoFailed) && (
              <p className="mt-1 text-right text-[0.58rem]" style={{ color: 'var(--c-muted)', opacity: 0.7 }}>
                © OpenStreetMap
              </p>
            )}
          </Reveal>
        )}
        <Reveal delay={0.18} className="mt-4">
          <MapButtons place={{ name: s.venueName, address: s.address, lat: s.lat, lng: s.lng }} />
        </Reveal>
      </div>

      {/* 하단: 식사 및 추가 안내 */}
      {s.items.length > 0 && (
        <div className="mt-14 flex flex-col justify-center">
          {s.infoTitle && (
            <Reveal>
              <p className="eyebrow mb-5">{s.infoTitle}</p>
            </Reveal>
          )}
          <div className="space-y-3">
            {s.items.map((it, i) => (
              <Reveal key={it.id} delay={i * 0.06}>
                <Accordion title={it.title} defaultOpen={it.open}>
                  <Body style={{ fontSize: 'calc(0.88rem * var(--body-scale,1))', lineHeight: 1.8 }}>{it.body}</Body>
                  {it.image && (
                    <div className="mt-4">
                      <Img image={it.image} aspect="original" radius={10} />
                    </div>
                  )}
                  {it.linkUrl && /^https?:\/\//.test(it.linkUrl) && (
                    <a href={it.linkUrl} target="_blank" rel="noreferrer" className="tap btn-ghost mt-4 inline-flex">
                      {it.linkLabel || '자세히 보기'} →
                    </a>
                  )}
                </Accordion>
              </Reveal>
            ))}
          </div>
        </div>
      )}
      <span className="sr-only">{name}</span>
    </SectionShell>
  )
}
