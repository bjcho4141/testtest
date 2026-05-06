-- ════════════════════════════════════════════════════════════════
-- 0003 — RLS Policies
-- 결함 3: AND-결합 is_paid() 본문 SQL 4테이블 작성
--         (conversion_jobs / bgm_recommendations / agent_logs / uploads)
-- 모든 결제 테이블 + 민감 테이블 RLS 활성화
-- ════════════════════════════════════════════════════════════════

alter table public.profiles               enable row level security;
alter table public.channels               enable row level security;
alter table public.shorts_pairs           enable row level security;
alter table public.conversion_jobs        enable row level security;
alter table public.bgm_recommendations    enable row level security;
alter table public.trending_sounds        enable row level security;
alter table public.agent_logs             enable row level security;
alter table public.uploads                enable row level security;
alter table public.payments               enable row level security;
alter table public.billing_keys           enable row level security;
alter table public.subscriptions          enable row level security;
alter table public.refunds                enable row level security;
alter table public.cost_ledger            enable row level security;
alter table public.channel_credentials    enable row level security;
alter table public.webhook_events         enable row level security;

-- ─────────────────────────────────────────────────────────────
-- profiles: 본인 row만 (결제 게이트 우회 — 본인 정보 항상 접근)
-- ─────────────────────────────────────────────────────────────
create policy "own profile select" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- INSERT는 트리거 (security definer)가 처리, 일반 클라이언트 차단
-- DELETE 차단

-- ─────────────────────────────────────────────────────────────
-- channels: 소유자 + 결제 게이트
-- ─────────────────────────────────────────────────────────────
create policy "own channels select" on public.channels
  for select using (auth.uid() = owner_id and public.is_paid(auth.uid()));
create policy "own channels insert" on public.channels
  for insert with check (auth.uid() = owner_id and public.is_paid(auth.uid()));
create policy "own channels update" on public.channels
  for update
  using (auth.uid() = owner_id and public.is_paid(auth.uid()))
  with check (auth.uid() = owner_id and public.is_paid(auth.uid()));
create policy "own channels delete" on public.channels
  for delete using (auth.uid() = owner_id and public.is_paid(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- shorts_pairs: 채널 소유자 + 결제 게이트
-- ─────────────────────────────────────────────────────────────
create policy "own pairs all" on public.shorts_pairs
  for all
  using (
    public.is_paid(auth.uid())
    and exists (
      select 1 from public.channels c
      where c.id = shorts_pairs.channel_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    public.is_paid(auth.uid())
    and exists (
      select 1 from public.channels c
      where c.id = shorts_pairs.channel_id
        and c.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 결함 3-A: conversion_jobs — pair → channel 소유자 + is_paid AND-결합
-- ─────────────────────────────────────────────────────────────
create policy "own jobs all" on public.conversion_jobs
  for all
  using (
    public.is_paid(auth.uid())
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = conversion_jobs.pair_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    public.is_paid(auth.uid())
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = conversion_jobs.pair_id
        and c.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 결함 3-B: bgm_recommendations — 동일 패턴
-- ─────────────────────────────────────────────────────────────
create policy "own bgm all" on public.bgm_recommendations
  for all
  using (
    public.is_paid(auth.uid())
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = bgm_recommendations.pair_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    public.is_paid(auth.uid())
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = bgm_recommendations.pair_id
        and c.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 결함 3-C: agent_logs — pair_id 또는 channel_id 둘 중 하나 일치 + is_paid
-- ─────────────────────────────────────────────────────────────
create policy "own agent_logs all" on public.agent_logs
  for all
  using (
    public.is_paid(auth.uid())
    and (
      (channel_id is not null and exists (
        select 1 from public.channels c
        where c.id = agent_logs.channel_id and c.owner_id = auth.uid()
      ))
      or (pair_id is not null and exists (
        select 1 from public.shorts_pairs sp
        join public.channels c on c.id = sp.channel_id
        where sp.id = agent_logs.pair_id and c.owner_id = auth.uid()
      ))
    )
  )
  with check (
    public.is_paid(auth.uid())
    and (
      (channel_id is not null and exists (
        select 1 from public.channels c
        where c.id = agent_logs.channel_id and c.owner_id = auth.uid()
      ))
      or (pair_id is not null and exists (
        select 1 from public.shorts_pairs sp
        join public.channels c on c.id = sp.channel_id
        where sp.id = agent_logs.pair_id and c.owner_id = auth.uid()
      ))
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 결함 3-D: uploads — 동일 패턴 (uploads_pair_idx 인덱스로 성능 보장)
-- ─────────────────────────────────────────────────────────────
create policy "own uploads all" on public.uploads
  for all
  using (
    public.is_paid(auth.uid())
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = uploads.pair_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    public.is_paid(auth.uid())
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = uploads.pair_id
        and c.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- trending_sounds: 채널 소유자 + 결제 게이트
-- ─────────────────────────────────────────────────────────────
create policy "own trending all" on public.trending_sounds
  for all
  using (
    public.is_paid(auth.uid())
    and exists (
      select 1 from public.channels c
      where c.id = trending_sounds.channel_id and c.owner_id = auth.uid()
    )
  )
  with check (
    public.is_paid(auth.uid())
    and exists (
      select 1 from public.channels c
      where c.id = trending_sounds.channel_id and c.owner_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- 결제 / 민감 테이블 RLS
-- ════════════════════════════════════════════════════════════════

-- payments: 본인 SELECT만 (INSERT/UPDATE는 service_role 전용)
create policy "own payments select" on public.payments
  for select using (auth.uid() = user_id);

-- subscriptions: 본인 SELECT만
create policy "own subscriptions select" on public.subscriptions
  for select using (auth.uid() = user_id);

-- refunds: 본인 결제에 한한 SELECT
create policy "own refunds select" on public.refunds
  for select using (
    exists (
      select 1 from public.payments p
      where p.id = refunds.payment_id and p.user_id = auth.uid()
    )
  );

-- billing_keys: 전부 deny (service_role 전용 RPC만 허용)
create policy "billing_keys deny all" on public.billing_keys
  for all using (false) with check (false);

-- channel_credentials: 전부 deny (server-side encrypted, service_role 전용)
create policy "channel_credentials deny all" on public.channel_credentials
  for all using (false) with check (false);

-- cost_ledger: 본인 채널 비용만 SELECT
create policy "own cost select" on public.cost_ledger
  for select using (
    pair_id is not null
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = cost_ledger.pair_id and c.owner_id = auth.uid()
    )
  );

-- webhook_events: 전부 deny (service_role 전용)
create policy "webhook_events deny all" on public.webhook_events
  for all using (false) with check (false);

-- ════════════════════════════════════════════════════════════════
-- 권한 grant (anon 차단 강화)
-- ════════════════════════════════════════════════════════════════
revoke all on public.billing_keys           from anon, authenticated;
revoke all on public.channel_credentials    from anon, authenticated;
revoke all on public.webhook_events         from anon, authenticated;

grant select on public.payments        to authenticated;
grant select on public.subscriptions   to authenticated;
grant select on public.refunds         to authenticated;
grant select on public.cost_ledger     to authenticated;
