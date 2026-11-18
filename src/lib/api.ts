import { requireClient, supabase } from './supabase'
import { normalizeContent } from './normalize'
import { defaultContent } from './defaults'
import { prepareImage } from './image'
import type { GuestbookEntry, GuestPhoto, InvitationContent, PublicInvitation } from './types'
import { uid } from './util'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ------------------------------------------------------------------ public (하객)

export async function fetchPublicInvitation(slug: string): Promise<PublicInvitation | null> {
  const sb = requireClient()
  const data = unwrap(await sb.rpc('get_public_invitation', { p_slug: slug })) as PublicInvitation | null
  if (!data) return null
  return { ...data, content: normalizeContent(data.content) }
}

export async function listGuestbook(slug: string, limit = 100, before?: string): Promise<GuestbookEntry[]> {
  const sb = requireClient()
  return unwrap(await sb.rpc('list_guestbook', { p_slug: slug, p_limit: limit, p_before: before ?? null })) ?? []
}

export async function submitGuestbook(input: {
  slug: string
  author: string
  message: string
  password?: string
  honeypot?: string
  elapsedMs?: number
}): Promise<{ id: string; public: boolean }> {
  const sb = requireClient()
  return unwrap(
    await sb.rpc('submit_guestbook', {
      p_slug: input.slug,
      p_author: input.author,
      p_message: input.message,
      p_password: input.password || null,
      p_honeypot: input.honeypot || null,
      p_elapsed_ms: input.elapsedMs ?? null,
    }),
  )
}

export async function guestDeleteGuestbook(id: string, password?: string): Promise<'deleted' | 'requested'> {
  const sb = requireClient()
  return unwrap(await sb.rpc('guest_delete_guestbook', { p_id: id, p_password: password || null }))
}

export async function listGuestPhotos(slug: string): Promise<GuestPhoto[]> {
  const sb = requireClient()
  const rows: GuestPhoto[] = unwrap(await sb.rpc('list_guest_photos', { p_slug: slug, p_limit: 300 })) ?? []
  return withSignedUrls(rows)
}

export async function withSignedUrls<T extends { storage_path: string; url?: string }>(rows: T[], thumb = true): Promise<T[]> {
  if (!rows.length) return rows
  const sb = requireClient()
  const { data } = await sb.storage.from('guest-photos').createSignedUrls(
    rows.map((r) => r.storage_path),
    60 * 60 * 6,
  )
  void thumb
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]))
  return rows.map((r) => ({ ...r, url: map.get(r.storage_path) || undefined }))
}

const EXT_TYPE: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' }

export async function uploadGuestPhoto(
  args: { slug: string; invitationId: string; file: File; author: string; message: string; consent: boolean },
  onProgress?: (phase: 'compress' | 'upload' | 'done') => void,
): Promise<{ id: string; status: string }> {
  const sb = requireClient()
  onProgress?.('compress')
  const prepared = await prepareImage(args.file, 3200, 0.9)
  let { type, ext } = prepared
  if (!type || type === 'application/octet-stream') {
    const e = (args.file.name.split('.').pop() || 'jpg').toLowerCase()
    ext = e === 'jpeg' ? 'jpg' : e
    type = EXT_TYPE[e] || 'image/jpeg'
  }
  const path = `${args.invitationId}/${uid()}.${ext}`
  onProgress?.('upload')
  const up = await sb.storage.from('guest-photos').upload(path, prepared.blob, { contentType: type, upsert: false })
  if (up.error) throw new Error(up.error.message)
  const res = unwrap(
    await sb.rpc('register_guest_photo', {
      p_slug: args.slug,
      p_path: path,
      p_author: args.author || null,
      p_message: args.message || null,
      p_width: prepared.width || null,
      p_height: prepared.height || null,
      p_bytes: prepared.blob.size,
      p_consent: args.consent,
    }),
  ) as { id: string; status: string }
  onProgress?.('done')
  return res
}

// ------------------------------------------------------------------ 참석 여부 회신

export interface RsvpInput {
  slug: string
  name: string
  side: 'groom' | 'bride' | null
  attending: boolean
  partySize: number
  meal: 'yes' | 'no' | 'undecided' | null
  note?: string
  id?: string
  token?: string
  honeypot?: string
}

export async function submitRsvp(i: RsvpInput): Promise<{ id: string; token: string }> {
  const sb = requireClient()
  return unwrap(
    await sb.rpc('submit_rsvp', {
      p_slug: i.slug,
      p_name: i.name,
      p_side: i.side,
      p_attending: i.attending,
      p_party_size: i.partySize,
      p_meal: i.meal,
      p_note: i.note || null,
      p_id: i.id ?? null,
      p_token: i.token ?? null,
      p_honeypot: i.honeypot || null,
    }),
  )
}

export interface RsvpRow {
  id: string
  name: string
  side: 'groom' | 'bride' | null
  attending: boolean
  party_size: number
  meal: 'yes' | 'no' | 'undecided' | null
  note: string | null
  version_slug: string | null
  created_at: string
  updated_at: string
}

export async function adminListRsvps(dataId: string): Promise<RsvpRow[]> {
  const sb = requireClient()
  return (
    unwrap(
      await sb
        .from('rsvps')
        .select('id, name, side, attending, party_size, meal, note, version_slug, created_at, updated_at')
        .eq('invitation_id', dataId)
        .order('updated_at', { ascending: false }),
    ) ?? []
  )
}

export async function adminDeleteRsvps(ids: string[]) {
  const sb = requireClient()
  unwrap(await sb.from('rsvps').delete().in('id', ids).select('id'))
}

// ------------------------------------------------------------------ admin (관리자)

export interface AdminInvitation {
  id: string
  slug: string
  name: string
  parent_id: string | null
  /** 축하글·하객사진·이미지·관리자·운영 스위치가 모이는 기본 청첩장 id */
  data_id: string
  draft: InvitationContent
  published: InvitationContent | null
  is_published: boolean
  published_at: string | null
  draft_updated_at: string
  guestbook_enabled: boolean
  guestbook_public: boolean
  uploads_enabled: boolean
  uploads_public: boolean
  uploads_require_approval: boolean
}

export type AdminFlags = Pick<
  AdminInvitation,
  'guestbook_enabled' | 'guestbook_public' | 'uploads_enabled' | 'uploads_public' | 'uploads_require_approval'
>

export async function claimInvitation(slug: string) {
  const sb = requireClient()
  return unwrap(await sb.rpc('claim_invitation', { p_slug: slug })) as { status: string; id: string }
}

export async function loadAdminInvitation(slug: string): Promise<AdminInvitation> {
  const sb = requireClient()
  const row = unwrap(await sb.from('invitations').select('*').eq('slug', slug).maybeSingle()) as
    | (Omit<AdminInvitation, 'draft' | 'published'> & { draft: unknown; published: unknown })
    | null
  if (!row) throw new Error('NOT_ADMIN')
  // 버전이면 운영 스위치는 기본 청첩장 값을 사용
  if (row.parent_id) {
    const root = unwrap(
      await sb
        .from('invitations')
        .select('guestbook_enabled, guestbook_public, uploads_enabled, uploads_public, uploads_require_approval')
        .eq('id', row.parent_id)
        .single(),
    ) as AdminFlags
    Object.assign(row, root)
  }
  ;(row as { data_id: string }).data_id = row.parent_id ?? row.id
  const empty = !row.draft || (typeof row.draft === 'object' && !Array.isArray((row.draft as { sections?: unknown }).sections))
  return {
    ...row,
    draft: empty ? defaultContent() : normalizeContent(row.draft),
    published: row.published ? normalizeContent(row.published) : null,
  }
}

// ------------------------------------------------------------------ 여러 버전

export interface VersionInfo {
  id: string
  slug: string
  name: string
  parent_id: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
}

export async function listInvitationGroup(dataId: string): Promise<VersionInfo[]> {
  const sb = requireClient()
  const rows: VersionInfo[] =
    unwrap(
      await sb
        .from('invitations')
        .select('id, slug, name, parent_id, is_published, published_at, created_at')
        .or(`id.eq.${dataId},parent_id.eq.${dataId}`)
        .order('created_at', { ascending: true }),
    ) ?? []
  return rows.sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0))
}

export async function createVersion(sourceId: string, name: string, slug: string) {
  const sb = requireClient()
  return unwrap(await sb.rpc('create_invitation_version', { p_source: sourceId, p_name: name, p_slug: slug })) as { id: string; slug: string }
}

export async function deleteVersion(id: string) {
  const sb = requireClient()
  unwrap(await sb.rpc('delete_invitation_version', { p_id: id }))
}

export async function renameVersion(id: string, name: string) {
  const sb = requireClient()
  unwrap(await sb.from('invitations').update({ name }).eq('id', id).select('id').single())
}

export async function saveDraft(id: string, draft: InvitationContent): Promise<string> {
  const sb = requireClient()
  const now = new Date().toISOString()
  const res = await sb.from('invitations').update({ draft, draft_updated_at: now }).eq('id', id).select('draft_updated_at').single()
  return (unwrap(res) as { draft_updated_at: string }).draft_updated_at
}

export async function updateFlags(id: string, flags: Partial<AdminFlags>) {
  const sb = requireClient()
  unwrap(await sb.from('invitations').update(flags).eq('id', id).select('id').single())
}

export async function publish(id: string, note?: string) {
  const sb = requireClient()
  return unwrap(await sb.rpc('publish_invitation', { p_invitation: id, p_note: note ?? null })) as {
    version_id: string
    published_at: string
  }
}

export async function unpublish(id: string) {
  const sb = requireClient()
  unwrap(await sb.rpc('unpublish_invitation', { p_invitation: id }))
}

export interface VersionRow {
  id: string
  note: string | null
  created_at: string
  content: InvitationContent
}

export async function listVersions(invitationId: string): Promise<VersionRow[]> {
  const sb = requireClient()
  return (
    unwrap(
      await sb
        .from('invitation_versions')
        .select('id, note, created_at, content')
        .eq('invitation_id', invitationId)
        .order('created_at', { ascending: false })
        .limit(50),
    ) ?? []
  )
}

export async function restoreVersion(versionId: string, publishNow: boolean): Promise<InvitationContent> {
  const sb = requireClient()
  const res = unwrap(await sb.rpc('restore_version', { p_version: versionId, p_publish: publishNow })) as { content: unknown }
  return normalizeContent(res.content)
}

export interface MediaAsset {
  id: string
  path: string
  width: number | null
  height: number | null
  bytes: number | null
  created_at: string
}

export async function listMedia(invitationId: string): Promise<MediaAsset[]> {
  const sb = requireClient()
  return (
    unwrap(
      await sb.from('media_assets').select('*').eq('invitation_id', invitationId).order('created_at', { ascending: false }),
    ) ?? []
  )
}

export async function uploadMedia(invitationId: string, file: File): Promise<MediaAsset> {
  const sb = requireClient()
  const prepared = await prepareImage(file, 2400, 0.86)
  const path = `${invitationId}/${uid()}.${prepared.ext}`
  const up = await sb.storage.from('media').upload(path, prepared.blob, {
    contentType: prepared.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (up.error) throw new Error(up.error.message)
  return unwrap(
    await sb
      .from('media_assets')
      .insert({ invitation_id: invitationId, path, width: prepared.width, height: prepared.height, bytes: prepared.blob.size })
      .select('*')
      .single(),
  )
}

export async function deleteMedia(asset: MediaAsset) {
  const sb = requireClient()
  const rm = await sb.storage.from('media').remove([asset.path])
  if (rm.error) throw new Error(rm.error.message)
  unwrap(await sb.from('media_assets').delete().eq('id', asset.id).select('id'))
}

export interface AdminGuestbookEntry {
  id: string
  author: string
  message: string
  is_hidden: boolean
  delete_requested: boolean
  created_at: string
  password_hash: string | null
}

export async function adminListGuestbook(invitationId: string): Promise<AdminGuestbookEntry[]> {
  const sb = requireClient()
  return (
    unwrap(
      await sb
        .from('guestbook_entries')
        .select('id, author, message, is_hidden, delete_requested, created_at, password_hash')
        .eq('invitation_id', invitationId)
        .order('created_at', { ascending: false }),
    ) ?? []
  )
}

export async function adminUpdateGuestbook(id: string, patch: Partial<Pick<AdminGuestbookEntry, 'is_hidden' | 'delete_requested'>>) {
  const sb = requireClient()
  unwrap(await sb.from('guestbook_entries').update(patch).eq('id', id).select('id').single())
}

export async function adminDeleteGuestbook(ids: string[]) {
  const sb = requireClient()
  unwrap(await sb.from('guestbook_entries').delete().in('id', ids).select('id'))
}

export interface AdminGuestPhoto extends GuestPhoto {
  status: 'pending' | 'approved' | 'hidden'
  bytes: number | null
}

export async function adminListGuestPhotos(invitationId: string): Promise<AdminGuestPhoto[]> {
  const sb = requireClient()
  const rows: AdminGuestPhoto[] =
    unwrap(
      await sb
        .from('guest_photos')
        .select('id, storage_path, author, message, width, height, created_at, status, bytes')
        .eq('invitation_id', invitationId)
        .order('created_at', { ascending: false }),
    ) ?? []
  return withSignedUrls(rows)
}

export async function adminSetPhotoStatus(ids: string[], status: AdminGuestPhoto['status']) {
  const sb = requireClient()
  unwrap(await sb.from('guest_photos').update({ status }).in('id', ids).select('id'))
}

export async function adminDeletePhotos(rows: Pick<AdminGuestPhoto, 'id' | 'storage_path'>[]) {
  const sb = requireClient()
  const rm = await sb.storage.from('guest-photos').remove(rows.map((r) => r.storage_path))
  if (rm.error) throw new Error(rm.error.message)
  unwrap(await sb.from('guest_photos').delete().in('id', rows.map((r) => r.id)).select('id'))
}

export async function listAdmins(invitationId: string) {
  const sb = requireClient()
  return (unwrap(await sb.rpc('list_invitation_admins', { p_invitation: invitationId })) ?? []) as {
    user_id: string
    email: string
    created_at: string
  }[]
}

export async function addAdmin(invitationId: string, email: string) {
  const sb = requireClient()
  return unwrap(await sb.rpc('add_invitation_admin', { p_invitation: invitationId, p_email: email }))
}

export { supabase }
