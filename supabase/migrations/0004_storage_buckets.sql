-- ════════════════════════════════════════════════════════════════
-- 0004 — Storage Buckets + RLS (PRD §3.5)
-- 4 buckets: media-input / media-artifacts / media-output (private)
--            thumbnails (public)
-- 경로 규칙: {channel_slug}/{pair_id}/{stage}/{filename}
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 버킷 생성 (idempotent: ON CONFLICT DO NOTHING)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media-input',     'media-input',     false, 524288000, null),  -- 500 MB
  ('media-artifacts', 'media-artifacts', false, 524288000, null),
  ('media-output',    'media-output',    false, 524288000, null),
  ('thumbnails',      'thumbnails',      true,  10485760,
    array['image/jpeg','image/png','image/webp'])                 -- 10 MB
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- RLS: storage.objects 정책
-- ─────────────────────────────────────────────────────────────
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
      where c.owner_id = auth.uid() and public.is_paid(auth.uid())
    )
  )
  with check (
    bucket_id in ('media-input','media-artifacts','media-output')
    and (storage.foldername(name))[1] in (
      select c.slug from public.channels c
      where c.owner_id = auth.uid() and public.is_paid(auth.uid())
    )
  );

-- thumbnails: 공개 read
drop policy if exists "thumb public read" on storage.objects;
create policy "thumb public read" on storage.objects
  for select
  to public
  using (bucket_id = 'thumbnails');

-- thumbnails: 본인 채널만 write (insert / update / delete)
drop policy if exists "thumb owner write" on storage.objects;
create policy "thumb owner write" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] in (
      select c.slug from public.channels c where c.owner_id = auth.uid()
    )
  );

drop policy if exists "thumb owner update" on storage.objects;
create policy "thumb owner update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] in (
      select c.slug from public.channels c where c.owner_id = auth.uid()
    )
  );

drop policy if exists "thumb owner delete" on storage.objects;
create policy "thumb owner delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] in (
      select c.slug from public.channels c where c.owner_id = auth.uid()
    )
  );

comment on policy "own media all" on storage.objects is
  'private 버킷 3종: 채널 소유자 + is_paid 게이트, 폴더 첫 세그먼트=channel.slug';
