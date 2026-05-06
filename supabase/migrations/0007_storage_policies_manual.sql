-- ════════════════════════════════════════════════════════════════
-- 0007 — Storage policies (수동 적용 필요)
-- ⚠️ Supabase MCP 권한으로는 storage.objects 정책 생성 불가
--    (ERROR: must be owner of relation objects)
--
-- 적용 방법:
--   Supabase Dashboard → SQL Editor → New query → 아래 전체 붙여넣기 → Run
--   또는 supabase CLI 로 직접 push (역할 권한 충분 시)
-- ════════════════════════════════════════════════════════════════

-- (storage.objects RLS는 Supabase 기본으로 활성화됨)

-- media-input / media-artifacts / media-output: 채널 소유자 + 결제 게이트
drop policy if exists "own media all" on storage.objects;
create policy "own media all" on storage.objects
  for all
  to authenticated
  using (
    bucket_id in ('media-input','media-artifacts','media-output')
    and (storage.foldername(name))[1] in (
      select c.slug from public.channels c
      where c.owner_id = (select auth.uid()) and public.is_paid((select auth.uid()))
    )
  )
  with check (
    bucket_id in ('media-input','media-artifacts','media-output')
    and (storage.foldername(name))[1] in (
      select c.slug from public.channels c
      where c.owner_id = (select auth.uid()) and public.is_paid((select auth.uid()))
    )
  );

-- thumbnails: 공개 read
drop policy if exists "thumb public read" on storage.objects;
create policy "thumb public read" on storage.objects
  for select
  to public
  using (bucket_id = 'thumbnails');

-- thumbnails: 본인 채널만 write
drop policy if exists "thumb owner write" on storage.objects;
create policy "thumb owner write" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] in (
      select c.slug from public.channels c where c.owner_id = (select auth.uid())
    )
  );

drop policy if exists "thumb owner update" on storage.objects;
create policy "thumb owner update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] in (
      select c.slug from public.channels c where c.owner_id = (select auth.uid())
    )
  );

drop policy if exists "thumb owner delete" on storage.objects;
create policy "thumb owner delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] in (
      select c.slug from public.channels c where c.owner_id = (select auth.uid())
    )
  );

comment on policy "own media all" on storage.objects is
  'private 버킷 3종: 채널 소유자 + is_paid 게이트, 폴더 첫 세그먼트=channel.slug';
