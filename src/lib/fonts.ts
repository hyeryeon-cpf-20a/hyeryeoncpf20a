export interface FontOption {
  family: string
  label: string
  css: string // 로드할 스타일시트 URL
  fallback: string
}

const g = (q: string) => `https://fonts.googleapis.com/css2?family=${q}&display=swap`

export const SCRIPT_FONTS: FontOption[] = [
  { family: 'Great Vibes', label: 'Great Vibes', css: g('Great+Vibes'), fallback: 'cursive' },
  { family: 'Pinyon Script', label: 'Pinyon Script', css: g('Pinyon+Script'), fallback: 'cursive' },
  { family: 'Parisienne', label: 'Parisienne', css: g('Parisienne'), fallback: 'cursive' },
  { family: 'Allura', label: 'Allura', css: g('Allura'), fallback: 'cursive' },
  { family: 'Monsieur La Doulaise', label: 'Monsieur La Doulaise', css: g('Monsieur+La+Doulaise'), fallback: 'cursive' },
  { family: 'Italianno', label: 'Italianno', css: g('Italianno'), fallback: 'cursive' },
]

export const SERIF_FONTS: FontOption[] = [
  { family: 'Cormorant Garamond', label: 'Cormorant Garamond', css: g('Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400'), fallback: 'serif' },
  { family: 'Cormorant', label: 'Cormorant', css: g('Cormorant:ital,wght@0,300;0,400;0,500;1,400'), fallback: 'serif' },
  { family: 'Playfair Display', label: 'Playfair Display', css: g('Playfair+Display:ital,wght@0,400;0,500;1,400'), fallback: 'serif' },
  { family: 'EB Garamond', label: 'EB Garamond', css: g('EB+Garamond:ital,wght@0,400;0,500;1,400'), fallback: 'serif' },
  { family: 'Libre Baskerville', label: 'Libre Baskerville', css: g('Libre+Baskerville:ital,wght@0,400;1,400'), fallback: 'serif' },
  { family: 'Bodoni Moda', label: 'Bodoni Moda', css: g('Bodoni+Moda:ital,wght@0,400;0,500;1,400'), fallback: 'serif' },
]

export const SANS_FONTS: FontOption[] = [
  {
    family: 'Pretendard',
    label: 'Pretendard (산세리프)',
    css: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
    fallback: 'system-ui, -apple-system, sans-serif',
  },
  { family: 'Noto Sans KR', label: 'Noto Sans KR (산세리프)', css: g('Noto+Sans+KR:wght@300;400;500'), fallback: 'sans-serif' },
  { family: 'Gowun Dodum', label: '고운돋움', css: g('Gowun+Dodum'), fallback: 'sans-serif' },
  { family: 'Nanum Myeongjo', label: '나눔명조 (명조)', css: g('Nanum+Myeongjo:wght@400;700'), fallback: 'serif' },
  { family: 'Gowun Batang', label: '고운바탕 (명조)', css: g('Gowun+Batang:wght@400;700'), fallback: 'serif' },
  { family: 'Noto Serif KR', label: 'Noto Serif KR (명조)', css: g('Noto+Serif+KR:wght@300;400;500'), fallback: 'serif' },
]

const ALL = [...SCRIPT_FONTS, ...SERIF_FONTS, ...SANS_FONTS]

export function fontStack(family: string) {
  const f = ALL.find((x) => x.family === family)
  return `'${family}', ${f?.fallback ?? 'serif'}`
}

const loaded = new Set<string>()

export function loadFonts(families: string[], doc: Document = document) {
  for (const fam of families) {
    const f = ALL.find((x) => x.family === fam)
    if (!f) continue
    const key = doc === document ? f.css : f.css + '#frame'
    if (loaded.has(key) && doc === document) continue
    if (doc.querySelector(`link[data-font="${CSS.escape(fam)}"]`)) continue
    loaded.add(key)
    const link = doc.createElement('link')
    link.rel = 'stylesheet'
    link.href = f.css
    link.dataset.font = fam
    doc.head.appendChild(link)
  }
}
