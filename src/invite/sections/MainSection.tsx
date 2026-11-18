import { motion } from 'framer-motion'
import type { SectionOf } from '../../lib/types'
import { formatEnDate, parseWedding } from '../../lib/date'
import { aspectRatio, imageSrc } from '../../lib/image'
import { useInvite } from '../context'
import { Img } from '../ui/Img'
import { SectionShell } from '../SectionShell'

export function MainSection({ section, selected }: { section: SectionOf<'main'>; selected?: boolean; ready?: boolean }) {
  const { content } = useInvite()
  const s = section.settings
  const date = parseWedding(content.wedding)
  const oval = s.photoShape !== 'rect'
  const aspect = oval ? '3:5' : s.aspect
  const ratio = aspectRatio(aspect, s.photo) ?? 0.75
  const src = imageSrc(s.photo)
  const fx = s.photo?.focusX ?? 50
  const fy = s.photo?.focusY ?? 50
  // 배경: 같은 사진을 흐리고 은은하게, 위아래는 바탕색으로 자연스럽게 녹아들도록
  const backdrop =
    s.bgPhoto && src ? (
      <>
        {/* 1/4 크기로 흐린 뒤 4배 확대 — 같은 모습, 훨씬 가벼운 계산 */}
        <motion.img
          src={src}
          alt=""
          decoding="async"
          className="absolute left-0 top-0 object-cover"
          style={{
            width: '25%',
            height: '25%',
            objectPosition: `${fx}% ${fy}%`,
            filter: s.bgBlur ? `blur(${s.bgBlur / 4}px) saturate(.9)` : 'saturate(.9)',
            transformOrigin: '0 0',
            transform: `scale(4) translate(${-Math.min(0.15, s.bgBlur / 160) * 100}%, ${-Math.min(0.15, s.bgBlur / 160) * 100}%) scale(${1 + Math.min(0.3, s.bgBlur / 80)})`,
          }}
          initial={false}
          animate={{ opacity: s.bgOpacity }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, var(--c-bg) 0%, transparent 22%, transparent 74%, var(--c-bg) 100%)' }}
        />
      </>
    ) : undefined
  return (
    <SectionShell section={section} selected={selected} backdrop={backdrop}>
      <div className="flex flex-col items-center">
        <motion.h1
          className="font-script leading-[1.05]"
          style={{ fontSize: `calc(${s.namesSize}rem * var(--title-scale, 1))`, color: 'var(--c-text)' }}
          initial={false}
        >
          {s.namesEn}
        </motion.h1>

        <motion.div
          className="mt-7 w-full"
          style={{
            // 화면 한 장에 들어오도록 사진 높이 제한 (비율 유지)
            width: oval
              ? `min(76%, calc((var(--app-h, 100svh) - 300px) * ${ratio.toFixed(4)}))`
              : `min(100%, calc((var(--app-h, 100svh) - 300px) * ${ratio.toFixed(4)}))`,
            minWidth: oval ? '52%' : '62%',
          }}
          initial={false}
        >
          <Img
            image={s.photo}
            aspect={aspect}
            radius={oval ? '50%' : s.photoRadius >= 200 ? '999px 999px 0 0' : s.photoRadius}
            eager
            alt="신랑 신부 메인 사진"
            style={oval ? { boxShadow: '0 20px 50px -24px rgba(81,74,67,.45)' } : undefined}
          />
        </motion.div>

        <div className="mt-8">
          <p className="font-serif-en text-[0.95rem] tracking-[0.34em]" style={{ fontSize: `calc(0.95rem * var(--body-scale,1))` }}>
            {s.dateText || formatEnDate(date)}
          </p>
          {s.fromText && (
            <p className="mt-3 text-[0.82rem] tracking-[0.06em]" style={{ color: 'var(--c-muted)', fontSize: `calc(0.82rem * var(--body-scale,1))` }}>
              {s.fromText}
            </p>
          )}
        </div>
      </div>
    </SectionShell>
  )
}
