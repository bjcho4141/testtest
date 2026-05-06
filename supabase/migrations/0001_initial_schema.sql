-- ════════════════════════════════════════════════════════════════
-- 0001 — Initial schema (14 tables + indexes)
-- PRD §3.2 ~ §3.2.1 + db-guard-team 결함 6건 + 사업결정 5건 반영
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 1. profiles  (auth.users 1:1 확장)
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  kakao_id text unique,
  role text not null default 'viewer'
    check (role in ('viewer','operator','admin','superadmin')),
  -- 결제 게이트
  paid_until timestamptz,
  subscription_status text not null default 'none'
    check (subscription_status in ('none','active','past_due','canceled','expired')),
  -- 보강: 16.x 지연 FK (subscriptions 테이블이 뒤에 정의되므로)
  active_subscription_id uuid,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. channels  (운영하는 일본 YouTube 채널)
-- ─────────────────────────────────────────────────────────────
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  -- 결함 6: slug 형식·길이 강제 (Storage 경로 안전성)
  slug text not null unique
    check (slug ~ '^[a-z0-9-]+$' and length(slug) between 2 and 40),
  description text,
  youtube_channel_id text,
  default_voice_id text,
  default_subtitle_style jsonb,
  -- Strike 관리
  upload_paused boolean not null default false,
  cg_strike_count int not null default 0,
  copyright_strike_count int not null default 0,
  last_strike_at timestamptz,
  last_strike_reason text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 3. shorts_pairs  (한국 숏츠 + 원본 영상 페어)
-- ─────────────────────────────────────────────────────────────
create table public.shorts_pairs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  korean_url text not null,
  original_url text,
  korean_meta jsonb,
  original_meta jsonb,
  -- 사업결정 1: license_source CHECK — 'cc' / 'self_filmed' 만 허용 (creator_permission 제외)
  license_source text not null
    check (license_source in ('cc','self_filmed')),
  license_evidence_url text not null,
  license_verified_at timestamptz,
  license_verified_by uuid references public.profiles(id),
  status text not null default 'pending'
    check (status in ('pending','queued','processing','review','uploaded','published','failed')),
  -- 사업결정 2: transformation 6개 강제 (분석 단계에서 생성된 변형 포인트 카운트)
  transformation_count int not null default 0
    check (transformation_count >= 0),  -- INSERT 시 0 허용, 분석 완료 시 >=6 강제는 앱/별도 트리거
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  selected_at timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- 4. conversion_jobs  (변환 단계별 진행 로그)
-- ─────────────────────────────────────────────────────────────
create table public.conversion_jobs (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.shorts_pairs(id) on delete cascade,
  stage text not null
    check (stage in ('download','stt','translation','tts','demucs','crop','subtitle','render','review')),
  status text not null default 'queued'
    check (status in ('queued','running','done','failed')),
  -- 동시성
  claimed_by text,
  claimed_at timestamptz,
  attempt int not null default 1,
  -- idempotency
  input_hash text,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  artifact_path text,
  metadata jsonb
);

-- 결함 4: UNIQUE(pair_id, stage, attempt) — race 방지
-- 애플리케이션 측 INSERT 패턴 (참조):
--   INSERT INTO conversion_jobs (pair_id, stage, attempt, ...)
--   VALUES ($1, $2, $3, ...)
--   ON CONFLICT (pair_id, stage, attempt) DO NOTHING
--   RETURNING id;
-- → RETURNING NULL 이면 다른 워커가 선점 → 다음 attempt 로 재시도
create unique index conversion_jobs_pair_stage_attempt_idx
  on public.conversion_jobs(pair_id, stage, attempt);

-- ─────────────────────────────────────────────────────────────
-- 5. bgm_recommendations
-- ─────────────────────────────────────────────────────────────
create table public.bgm_recommendations (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.shorts_pairs(id) on delete cascade,
  rank int not null check (rank between 1 and 5),
  search_keyword text not null,
  usage_pattern text,
  mood_match text,
  volume_guide int default 30
);

-- ─────────────────────────────────────────────────────────────
-- 6. trending_sounds
-- ─────────────────────────────────────────────────────────────
create table public.trending_sounds (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  keyword text not null,
  category text,
  added_at timestamptz not null default now(),
  active boolean not null default true
);

-- ─────────────────────────────────────────────────────────────
-- 7. agent_logs  (소통방)
-- ─────────────────────────────────────────────────────────────
create table public.agent_logs (
  id bigserial primary key,
  pair_id uuid references public.shorts_pairs(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  from_actor text not null,
  to_actor text not null,
  type text not null check (type in ('command','report','gate','error')),
  message text not null,
  step int,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 8. uploads  (YouTube 업로드 결과)
-- ─────────────────────────────────────────────────────────────
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.shorts_pairs(id) on delete cascade,
  youtube_video_id text,
  visibility text not null default 'unlisted'
    check (visibility in ('unlisted','public','private')),
  title text,
  description text,
  tags text[],
  altered_content boolean not null default true,
  default_language text not null default 'ja',
  content_id_status text not null default 'pending'
    check (content_id_status in ('pending','none','monetize','block','takedown')),
  content_id_checked_at timestamptz,
  content_id_payload jsonb,
  uploaded_at timestamptz,
  bgm_added boolean not null default false,
  published_at timestamptz,
  metadata jsonb
);

-- ─────────────────────────────────────────────────────────────
-- 9. channel_credentials  (OAuth refresh token 격리, RLS deny)
-- ─────────────────────────────────────────────────────────────
create table public.channel_credentials (
  channel_id uuid primary key references public.channels(id) on delete cascade,
  oauth_refresh_token_encrypted bytea not null,
  encrypted_at timestamptz not null default now(),
  rotated_at timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- 10. payments  (토스페이먼츠 결제)
-- ─────────────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_key text unique not null,
  order_id text unique not null,
  amount int not null,
  currency text not null default 'KRW',
  status text not null
    check (status in ('READY','IN_PROGRESS','DONE','CANCELED','PARTIAL_CANCELED','FAILED','EXPIRED')),
  method text,
  approved_at timestamptz,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 11. billing_keys  (정기결제 빌링키, 암호화)
-- ─────────────────────────────────────────────────────────────
create table public.billing_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_key text unique not null,
  billing_key_encrypted bytea not null,
  card_company text,
  card_last4 text,
  status text not null default 'active'
    check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- 12. subscriptions
-- ─────────────────────────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  billing_key_id uuid references public.billing_keys(id),
  plan text not null default 'standard',
  amount int not null default 9900,
  status text not null default 'active'
    check (status in ('active','past_due','canceled','expired')),
  next_charge_at timestamptz not null,
  last_charged_at timestamptz,
  failure_count int not null default 0,
  started_at timestamptz not null default now(),
  canceled_at timestamptz,
  expires_at timestamptz
);

-- profiles.active_subscription_id 지연 FK (16.x deferrable initially deferred)
alter table public.profiles
  add constraint profiles_active_subscription_fkey
  foreign key (active_subscription_id)
  references public.subscriptions(id)
  on delete set null
  deferrable initially deferred;

-- ─────────────────────────────────────────────────────────────
-- 13. refunds
-- ─────────────────────────────────────────────────────────────
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  cancel_reason text not null,
  cancel_amount int not null,
  status text not null default 'requested'
    check (status in ('requested','done','failed')),
  raw_response jsonb,
  requested_at timestamptz not null default now(),
  canceled_at timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- 14. cost_ledger  (영상당 API 비용 추적)
-- ─────────────────────────────────────────────────────────────
-- 결함 5: pair_id ON DELETE SET NULL + pair_id_snapshot NOT NULL (KPI 회계 무결성)
create table public.cost_ledger (
  id bigserial primary key,
  pair_id uuid references public.shorts_pairs(id) on delete set null,
  pair_id_snapshot uuid not null,         -- shorts_pairs 삭제 후에도 회계 추적용 불변 스냅샷
  service text not null
    check (service in ('elevenlabs','llm','youtube','demucs','storage','toss')),
  units numeric,
  usd numeric,
  krw numeric,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 15. webhook_events  (security-team F-2: 멱등성 dedup)
-- ─────────────────────────────────────────────────────────────
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  payment_key text not null,
  status text not null,
  raw_payload jsonb not null,
  processed_at timestamptz not null default now(),
  unique (payment_key, status)
);

-- ════════════════════════════════════════════════════════════════
-- 인덱스 (PRD §3.2 + 결함 2: uploads.pair_id RLS join 풀스캔 방지)
-- ════════════════════════════════════════════════════════════════

create index shorts_pairs_channel_status_idx
  on public.shorts_pairs(channel_id, status);
create index shorts_pairs_status_created_idx
  on public.shorts_pairs(status, created_at);

-- 결함 2: uploads(pair_id) 인덱스 — RLS exists join 성능
create index uploads_pair_idx on public.uploads(pair_id);
create index uploads_content_id_pending_idx
  on public.uploads(content_id_status)
  where content_id_status = 'pending';

create index profiles_paid_until_idx
  on public.profiles(paid_until)
  where paid_until is not null;

create index agent_logs_pair_idx
  on public.agent_logs(pair_id, created_at desc);
create index agent_logs_channel_idx
  on public.agent_logs(channel_id, created_at desc);

create index cost_ledger_pair_idx on public.cost_ledger(pair_id);
create index cost_ledger_pair_snapshot_idx on public.cost_ledger(pair_id_snapshot);

create index payments_user_idx
  on public.payments(user_id, created_at desc);

-- 보강 3: subscriptions.next_charge_at 부분 인덱스 (asc, status='active')
create index subscriptions_next_charge_idx
  on public.subscriptions(next_charge_at asc)
  where status = 'active';

-- bgm_recommendations / trending_sounds / conversion_jobs FK 조회 보강
create index bgm_recommendations_pair_idx on public.bgm_recommendations(pair_id);
create index trending_sounds_channel_idx on public.trending_sounds(channel_id, active);
create index conversion_jobs_pair_idx on public.conversion_jobs(pair_id, stage);

comment on table public.profiles is 'auth.users 1:1 확장 + 결제 게이트 컬럼';
comment on table public.shorts_pairs is '한국 숏츠 + 원본 영상 페어 — 변환 작업 단위';
comment on table public.cost_ledger is 'pair_id_snapshot은 shorts_pairs 삭제 후에도 회계 무결성 유지';
comment on table public.webhook_events is '토스페이먼츠 webhook 멱등성 dedup (security-team F-2)';
