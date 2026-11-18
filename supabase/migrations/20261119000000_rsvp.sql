-- =====================================================================
--  참석 여부 회신 (RSVP)
--  - 하객은 RPC 로만 회신을 보낼 수 있고, 목록은 관리자만 볼 수 있습니다.
--  - 같은 휴대폰에서 다시 보내면 (edit_token) 새로 쌓지 않고 이전 회신을 수정합니다.
--  - 여러 버전이 있어도 회신은 기본 청첩장 하나에 모입니다.
-- =====================================================================

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  edit_token uuid not null default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 20),
  side text check (side in ('groom', 'bride')),
  attending boolean not null,
  party_size int not null default 1 check (party_size between 0 and 20),
  meal text check (meal in ('yes', 'no', 'undecided')),
  note text check (char_length(note) <= 100),
  version_slug text,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rsvps_inv_idx on public.rsvps (invitation_id, created_at desc);

alter table public.rsvps enable row level security;
revoke all on public.rsvps from anon, authenticated;
grant select, delete on public.rsvps to authenticated;

drop policy if exists "admins read rsvps" on public.rsvps;
create policy "admins read rsvps" on public.rsvps
  for select to authenticated using (public.is_invitation_admin(invitation_id));
drop policy if exists "admins delete rsvps" on public.rsvps;
create policy "admins delete rsvps" on public.rsvps
  for delete to authenticated using (public.is_invitation_admin(invitation_id));

create or replace function public.submit_rsvp(
  p_slug text,
  p_name text,
  p_side text,
  p_attending boolean,
  p_party_size int default 1,
  p_meal text default null,
  p_note text default null,
  p_id uuid default null,
  p_token uuid default null,
  p_honeypot text default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  ver public.invitations;
  root uuid;
  ip text := public.request_ip_hash();
  n text := btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g'));
  party int := case when p_attending then greatest(1, least(coalesce(p_party_size, 1), 20)) else 0 end;
  rid uuid;
  tok uuid;
begin
  select * into ver from public.invitations where slug = p_slug and is_published;
  if not found then raise exception 'NOT_FOUND'; end if;
  root := coalesce(ver.parent_id, ver.id);

  if coalesce(p_honeypot, '') <> '' then raise exception 'SPAM_DETECTED'; end if;
  if char_length(n) < 1 or char_length(n) > 20 then raise exception 'INVALID_AUTHOR'; end if;
  if p_side is not null and p_side not in ('groom', 'bride') then raise exception 'INVALID_INPUT'; end if;
  if p_meal is not null and p_meal not in ('yes', 'no', 'undecided') then raise exception 'INVALID_INPUT'; end if;
  if char_length(coalesce(p_note, '')) > 100 then raise exception 'INVALID_INPUT'; end if;

  perform public.hit_rate_limit('rsvp', ip, 10, interval '10 minutes');
  perform public.hit_rate_limit('rsvp-inv', root::text, 300, interval '10 minutes');

  -- 같은 휴대폰(토큰 일치)이면 기존 회신 수정
  if p_id is not null and p_token is not null then
    update public.rsvps
       set name = n, side = p_side, attending = p_attending, party_size = party,
           meal = case when p_attending then p_meal end, note = nullif(btrim(p_note), ''),
           version_slug = p_slug, updated_at = now()
     where id = p_id and edit_token = p_token and invitation_id = root
     returning id, edit_token into rid, tok;
  end if;

  if rid is null then
    insert into public.rsvps (invitation_id, name, side, attending, party_size, meal, note, version_slug, ip_hash)
    values (root, n, p_side, p_attending, party, case when p_attending then p_meal end, nullif(btrim(p_note), ''), p_slug, ip)
    returning id, edit_token into rid, tok;
  end if;

  return json_build_object('id', rid, 'token', tok);
end;
$$;

revoke execute on function public.submit_rsvp(text, text, text, boolean, int, text, text, uuid, uuid, text) from public;
grant execute on function public.submit_rsvp(text, text, text, boolean, int, text, text, uuid, uuid, text) to anon, authenticated;
