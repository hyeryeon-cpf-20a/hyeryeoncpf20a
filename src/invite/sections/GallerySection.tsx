import { useRef, useState } from 'react'
import type { GalleryPhoto, SectionOf } from '../../lib/types'
import { imageSrc } from '../../lib/image'
import { Img } from '../ui/Img'
import { Lightbox } from '../ui/Lightbox'
import { Reveal } from '../ui/Reveal'
import { SectionShell, SectionTitle } from '../SectionShell'

/** 에디토리얼 콜라주: 사진 수에 따라 자동으로 패턴을 반복 */
function Editorial({ photos, open }: { photos: GalleryPhoto[]; open: (i: number) => void }) {
  const blocks: GalleryPhoto[][] = []
  for (let i = 0; i < photos.length; i += 3) blocks.push(photos.slice(i, i + 3))
  return (
    <div className="space-y-3">
      {blocks.map((b, bi) => {
        const base = bi * 3
        const flip = bi % 2 === 1
        if (b.length === 1)
          return (
            <Reveal key={bi} variant="zoom">
              <Img image={b[0].image} aspect="4:5" onClick={() => open(base)} alt={b[0].caption} />
            </Reveal>
          )
        if (b.length === 2)
          return (
            <div key={bi} className="grid grid-cols-2 gap-3">
              {b.map((p, j) => (
                <Reveal key={p.id} delay={j * 0.08}>
                  <Img image={p.image} aspect="3:4" onClick={() => open(base + j)} alt={p.caption} />
                </Reveal>
              ))}
            </div>
          )
        return (
          <div key={bi} className="space-y-3">
            <Reveal variant="zoom">
              <Img image={b[0].image} aspect={flip ? '4:3' : '4:5'} onClick={() => open(base)} alt={b[0].caption} />
            </Reveal>
            <div className={`grid gap-3 ${flip ? 'grid-cols-[1fr_1.4fr]' : 'grid-cols-[1.4fr_1fr]'}`}>
              <Reveal delay={0.05}>
                <Img image={b[1].image} aspect={flip ? '3:4' : '4:5'} onClick={() => open(base + 1)} alt={b[1].caption} />
              </Reveal>
              <Reveal delay={0.12} className="flex flex-col justify-end">
                <Img image={b[2].image} aspect={flip ? '4:5' : '3:4'} onClick={() => open(base + 2)} alt={b[2].caption} />
              </Reveal>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Slider({ photos, open }: { photos: GalleryPhoto[]; open: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const w = el.clientWidth * 0.82
    setIdx(Math.round(el.scrollLeft / (w + 12)))
  }
  return (
    <div className="-mx-6">
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2"
        style={{ scrollPaddingLeft: 24, overscrollBehaviorX: 'contain' }}
      >
        {photos.map((p, i) => (
          <div key={p.id} className="w-[82%] shrink-0 snap-start">
            <Img image={p.image} aspect="3:4" onClick={() => open(i)} alt={p.caption} />
            {p.caption && (
              <p className="mt-2 text-left text-[0.78rem]" style={{ color: 'var(--c-muted)' }}>
                {p.caption}
              </p>
            )}
          </div>
        ))}
        <div className="w-3 shrink-0" />
      </div>
      <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
        {photos.map((p, i) => (
          <span
            key={p.id}
            className="h-1 rounded-full transition-all duration-300"
            style={{ width: i === idx ? 16 : 4, background: 'var(--c-text)', opacity: i === idx ? 0.6 : 0.18 }}
          />
        ))}
      </div>
    </div>
  )
}

export function GallerySection({ section, selected }: { section: SectionOf<'gallery'>; selected?: boolean }) {
  const s = section.settings
  const [open, setOpen] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const photos = s.photos.filter((p) => imageSrc(p.image))
  const limit = s.layout === 'slide' || expanded ? photos.length : Math.max(1, s.initialCount || photos.length)
  const visible = photos.slice(0, limit)

  return (
    <SectionShell section={section} selected={selected}>
      <Reveal>
        <SectionTitle eyebrow={s.eyebrow} title={s.title} />
      </Reveal>
      {photos.length === 0 ? (
        <p className="text-[0.86rem]" style={{ color: 'var(--c-muted)' }}>
          곧 사진이 채워질 예정이에요.
        </p>
      ) : s.layout === 'slide' ? (
        <Slider photos={photos} open={setOpen} />
      ) : s.layout === 'editorial' ? (
        <Editorial photos={visible} open={setOpen} />
      ) : (
        <div className={`grid gap-1.5 ${s.columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {visible.map((p, i) => (
            <Reveal key={p.id} delay={(i % 6) * 0.05} variant="fade">
              <Img image={p.image} aspect="1:1" onClick={() => setOpen(i)} alt={p.caption} />
            </Reveal>
          ))}
        </div>
      )}
      {s.layout !== 'slide' && photos.length > limit && (
        <button type="button" className="tap btn-ghost mt-8 inline-flex items-center gap-2" onClick={() => setExpanded(true)}>
          사진 더보기 <span style={{ color: 'var(--c-muted)' }}>+{photos.length - limit}</span>
        </button>
      )}
      <Lightbox
        items={photos.map((p) => ({ src: imageSrc(p.image)!, caption: p.caption }))}
        index={open}
        onClose={() => setOpen(null)}
      />
    </SectionShell>
  )
}
