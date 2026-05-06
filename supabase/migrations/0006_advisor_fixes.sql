-- ════════════════════════════════════════════════════════════════
-- 0006 — Advisor fixes (Supabase database-linter 대응)
--   1) handle_new_user RPC 노출 차단 (트리거 전용 함수)
--   2) FK 8건 인덱스 추가 (unindexed_foreign_keys)
--   3) RLS 15건 (select auth.uid()) 패턴 — Auth RLS InitPlan 최적화
-- 적용 결과: 보안 WARN 3→1, 성능 WARN 23→0
-- 남은 1건: public.is_paid(uuid) RPC 노출 — RLS 내부 호출용 의도된 GRANT (무시)
-- ════════════════════════════════════════════════════════════════

-- 1) handle_new_user — public/anon/authenticated REVOKE
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- 2) FK 인덱스 (8건)
create index if not exists billing_keys_user_idx          on public.billing_keys(user_id);
create index if not exists channels_owner_idx             on public.channels(owner_id);
create index if not exists profiles_active_subscription_idx on public.profiles(active_subscription_id);
create index if not exists refunds_payment_idx            on public.refunds(payment_id);
create index if not exists shorts_pairs_created_by_idx    on public.shorts_pairs(created_by);
create index if not exists shorts_pairs_license_verified_by_idx on public.shorts_pairs(license_verified_by);
create index if not exists subscriptions_billing_key_idx  on public.subscriptions(billing_key_id);
create index if not exists subscriptions_user_idx         on public.subscriptions(user_id);

-- 3) RLS 정책 재작성: auth.uid() → (select auth.uid())
--    https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- profiles
drop policy if exists "own profile select" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile select" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- channels
drop policy if exists "own channels select" on public.channels;
drop policy if exists "own channels insert" on public.channels;
drop policy if exists "own channels update" on public.channels;
drop policy if exists "own channels delete" on public.channels;
create policy "own channels select" on public.channels
  for select using ((select auth.uid()) = owner_id and public.is_paid((select auth.uid())));
create policy "own channels insert" on public.channels
  for insert with check ((select auth.uid()) = owner_id and public.is_paid((select auth.uid())));
create policy "own channels update" on public.channels
  for update
  using ((select auth.uid()) = owner_id and public.is_paid((select auth.uid())))
  with check ((select auth.uid()) = owner_id and public.is_paid((select auth.uid())));
create policy "own channels delete" on public.channels
  for delete using ((select auth.uid()) = owner_id and public.is_paid((select auth.uid())));

-- shorts_pairs
drop policy if exists "own pairs all" on public.shorts_pairs;
create policy "own pairs all" on public.shorts_pairs
  for all
  using (
    public.is_paid((select auth.uid()))
    and exists (
      select 1 from public.channels c
      where c.id = shorts_pairs.channel_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_paid((select auth.uid()))
    and exists (
      select 1 from public.channels c
      where c.id = shorts_pairs.channel_id
        and c.owner_id = (select auth.uid())
    )
  );

-- conversion_jobs
drop policy if exists "own jobs all" on public.conversion_jobs;
create policy "own jobs all" on public.conversion_jobs
  for all
  using (
    public.is_paid((select auth.uid()))
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = conversion_jobs.pair_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_paid((select auth.uid()))
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = conversion_jobs.pair_id
        and c.owner_id = (select auth.uid())
    )
  );

-- bgm_recommendations
drop policy if exists "own bgm all" on public.bgm_recommendations;
create policy "own bgm all" on public.bgm_recommendations
  for all
  using (
    public.is_paid((select auth.uid()))
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = bgm_recommendations.pair_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_paid((select auth.uid()))
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = bgm_recommendations.pair_id
        and c.owner_id = (select auth.uid())
    )
  );

-- agent_logs
drop policy if exists "own agent_logs all" on public.agent_logs;
create policy "own agent_logs all" on public.agent_logs
  for all
  using (
    public.is_paid((select auth.uid()))
    and (
      (channel_id is not null and exists (
        select 1 from public.channels c
        where c.id = agent_logs.channel_id and c.owner_id = (select auth.uid())
      ))
      or (pair_id is not null and exists (
        select 1 from public.shorts_pairs sp
        join public.channels c on c.id = sp.channel_id
        where sp.id = agent_logs.pair_id and c.owner_id = (select auth.uid())
      ))
    )
  )
  with check (
    public.is_paid((select auth.uid()))
    and (
      (channel_id is not null and exists (
        select 1 from public.channels c
        where c.id = agent_logs.channel_id and c.owner_id = (select auth.uid())
      ))
      or (pair_id is not null and exists (
        select 1 from public.shorts_pairs sp
        join public.channels c on c.id = sp.channel_id
        where sp.id = agent_logs.pair_id and c.owner_id = (select auth.uid())
      ))
    )
  );

-- uploads
drop policy if exists "own uploads all" on public.uploads;
create policy "own uploads all" on public.uploads
  for all
  using (
    public.is_paid((select auth.uid()))
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = uploads.pair_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_paid((select auth.uid()))
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = uploads.pair_id
        and c.owner_id = (select auth.uid())
    )
  );

-- trending_sounds
drop policy if exists "own trending all" on public.trending_sounds;
create policy "own trending all" on public.trending_sounds
  for all
  using (
    public.is_paid((select auth.uid()))
    and exists (
      select 1 from public.channels c
      where c.id = trending_sounds.channel_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_paid((select auth.uid()))
    and exists (
      select 1 from public.channels c
      where c.id = trending_sounds.channel_id and c.owner_id = (select auth.uid())
    )
  );

-- payments
drop policy if exists "own payments select" on public.payments;
create policy "own payments select" on public.payments
  for select using ((select auth.uid()) = user_id);

-- subscriptions
drop policy if exists "own subscriptions select" on public.subscriptions;
create policy "own subscriptions select" on public.subscriptions
  for select using ((select auth.uid()) = user_id);

-- refunds
drop policy if exists "own refunds select" on public.refunds;
create policy "own refunds select" on public.refunds
  for select using (
    exists (
      select 1 from public.payments p
      where p.id = refunds.payment_id and p.user_id = (select auth.uid())
    )
  );

-- cost_ledger
drop policy if exists "own cost select" on public.cost_ledger;
create policy "own cost select" on public.cost_ledger
  for select using (
    pair_id is not null
    and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = cost_ledger.pair_id and c.owner_id = (select auth.uid())
    )
  );
