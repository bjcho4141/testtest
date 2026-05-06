-- ════════════════════════════════════════════════════════════════
-- 0002 — Functions + Triggers
-- 결함 1: is_paid() language sql stable security definer set search_path
-- 보강 1: handle_new_user() set search_path = public, pg_temp 코드 명시
-- 결함 6 보강: channels.slug immutable 트리거
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- is_paid(uid) — 결제 게이트 헬퍼
-- 결함 1: search_path 명시 + security definer (RLS 내부 호출 시 권한 회피 방지)
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_paid(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and (role = 'superadmin'
           or email = 'bjcho9542@gmail.com'
           or paid_until > now()
           or subscription_status = 'active')
  );
$$;

-- 권한: authenticated 만 호출 가능 (anon 차단)
revoke all on function public.is_paid(uuid) from public, anon;
grant execute on function public.is_paid(uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- handle_new_user() — auth.users 신규 가입 시 profiles 자동 생성
-- 보강 1: set search_path 코드 명시 + idempotent (unique_violation 흡수)
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
exception
  when unique_violation then
    -- 트리거 재실행 안전성 (대표님 첫 로그인 후 재배포 시나리오 등)
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- channels_slug_immutable — Storage 경로 키 무결성 보장
-- ─────────────────────────────────────────────────────────────
create or replace function public.channels_slug_immutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.slug is not null and old.slug <> new.slug then
    raise exception 'channels.slug is immutable (Storage path key)'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists channels_slug_immutable_trg on public.channels;
create trigger channels_slug_immutable_trg
  before update on public.channels
  for each row execute function public.channels_slug_immutable();

-- ─────────────────────────────────────────────────────────────
-- updated_at 자동 갱신 트리거 (선택 — 향후 활용)
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.is_paid(uuid) is
  '결제 게이트: superadmin / 운영자 이메일 / paid_until / active 구독 중 하나';
comment on function public.handle_new_user() is
  'auth.users 신규 가입 → public.profiles 자동 생성 (idempotent)';
comment on function public.channels_slug_immutable() is
  'channels.slug 변경 차단 (Storage 경로 안정성)';
