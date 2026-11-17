import { motion } from 'framer-motion'
import type { SectionOf } from '../../lib/types'
import { formatEnDate, parseWedding } from '../../lib/date'
import { aspectRatio } from '../../lib/image'
import { useInvite } from '../context'
import { Img } from '../ui/Img'
import { Reveal } from '../ui/Reveal'
import { SectionShell } from '../SectionShell'

export function MainSection({ section, selected, ready }: { section: SectionOf<'main'>; selected?: boolean; ready: boolean }) {
  const { content, motionOn, speed } = useInvite()
  const s = section.settings
  const date = parseWedding(content.wedding)
  const ratio = aspectRatio(s.aspect, s.photo) ?? 0.75
  const anim = section.style.animation.enabled && motionOn
  const d = section.style.animation.duration / speed
  return (
    <SectionShell section={section} selected={selected}>
      <div className="flex flex-col items-center">
        <motion.h1
          className="font-script leading-[1.05]"
          style={{ fontSize: `calc(${s.namesSize}rem * var(--title-scale, 1))`, color: 'var(--c-text)' }}
          initial={anim ? { opacity: 0, y: 14, filter: 'blur(4px)' } : false}
          animate={ready ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
          transition={{ duration: d * 1.1, ease: [0.22, 0.61, 0.36, 1], delay: 0.15 / speed }}
        >
          {s.namesEn}
        </motion.h1>

        <motion.div
          className="mt-7 w-full"
          style={{
            // 화면 한 장에 들어오도록 사진 높이 제한 (비율 유지)
            width: `min(100%, calc((100svh - 300px) * ${ratio.toFixed(4)}))`,
            minWidth: '62%',
          }}
          initial={anim ? { opacity: 0 } : false}
          animate={ready ? { opacity: 1 } : undefined}
          transition={{ duration: d * 1.6, delay: 0.55 / speed, ease: 'easeOut' }}
        >
          <Img image={s.photo} aspect={s.aspect} radius={s.photoRadius >= 200 ? '999px 999px 0 0' : s.photoRadius} zoomIn eager alt="신랑 신부 메인 사진" />
        </motion.div>

        <Reveal className="mt-8" delay={0.9}>
          <p className="font-serif-en text-[0.95rem] tracking-[0.34em]" style={{ fontSize: `calc(0.95rem * var(--body-scale,1))` }}>
            {s.dateText || formatEnDate(date)}
          </p>
          {s.fromText && (
            <p className="mt-3 text-[0.82rem] tracking-[0.06em]" style={{ color: 'var(--c-muted)', fontSize: `calc(0.82rem * var(--body-scale,1))` }}>
              {s.fromText}
            </p>
          )}
        </Reveal>
      </div>
    </SectionShell>
  )
}
