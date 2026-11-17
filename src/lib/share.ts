import { DEFAULT_SLUG } from './defaults'
import type { InvitationContent } from './types'
import { imageSrc } from './image'

const KAKAO_SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'

/** 하객에게 보낼 주소 — 기본 청첩장은 도메인만으로 열림 (예: https://our-wedding.vercel.app) */
export function inviteUrl(slug: string, origin = window.location.origin) {
  return slug === DEFAULT_SLUG ? `${origin}/` : `${origin}/invite/${slug}`
}

function loadKakao(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Kakao) return resolve()
    const el = document.createElement('script')
    el.src = KAKAO_SDK
    el.crossOrigin = 'anonymous'
    el.onload = () => resolve()
    el.onerror = () => reject(new Error('카카오 SDK를 불러오지 못했어요'))
    document.head.appendChild(el)
  })
}

/** 카카오톡 공유 (JavaScript 키 + 도메인 등록 필요). 키가 없으면 false 를 반환합니다. */
export async function shareKakao(content: InvitationContent, url: string): Promise<boolean> {
  const key = content.share.kakaoJsKey?.trim()
  if (!key) return false
  await loadKakao()
  if (!window.Kakao) return false
  if (!window.Kakao.isInitialized()) window.Kakao.init(key)
  const img = imageSrc(shareImageRef(content))
  const abs = img ? new URL(img, window.location.origin).toString() : undefined
  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: content.share.title,
      description: content.share.description.replace(/\n/g, ' '),
      imageUrl: abs,
      link: { mobileWebUrl: url, webUrl: url },
    },
    buttons: [{ title: content.share.buttonText || '모바일 청첩장 보기', link: { mobileWebUrl: url, webUrl: url } }],
  })
  return true
}

/** 기기 공유 시트(문자·카카오톡 등) → 실패 시 null */
export async function shareNative(title: string, text: string, url: string): Promise<boolean> {
  if (!navigator.share) return false
  try {
    await navigator.share({ title, text, url })
    return true
  } catch {
    return false
  }
}

export function smsHref(text: string, url: string) {
  return `sms:?&body=${encodeURIComponent(`${text}\n${url}`)}`
}

export function shareImageRef(content: InvitationContent) {
  if (content.share.image) return content.share.image
  const main = content.sections.find((s) => s.type === 'main')
  return main?.type === 'main' ? main.settings.photo : null
}
