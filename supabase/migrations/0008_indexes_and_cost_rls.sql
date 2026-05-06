-- 0008 — 인덱스 + cost_ledger RLS 보강 (4팀 검수 결과)
--
-- 1) past_due 부분 인덱스 (cron/billing/charge L174 풀스캔 방지)
-- 2) cost_ledger RLS: pair_id IS NULL 인 toss/storage 비용도
--    pair_id_snapshot 으로 본인 채널 매핑 (사업결정 5 회계 무결성)

create index if not exists subscriptions_past_due_idx
  on public.subscriptions(user_id) where status='past_due';

drop policy if exists "own cost select" on public.cost_ledger;
create policy "own cost select" on public.cost_ledger
  for select using (
    (pair_id is not null and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = cost_ledger.pair_id and c.owner_id = (select auth.uid())
    ))
    or (pair_id is null and exists (
      select 1 from public.shorts_pairs sp
      join public.channels c on c.id = sp.channel_id
      where sp.id = cost_ledger.pair_id_snapshot and c.owner_id = (select auth.uid())
    ))
  );
