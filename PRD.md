# PRD: utube-shorts-jp — 한국 숏츠 → 일본어 자동 현지화 시스템

> 최종 업데이트: 2026-05-04
> 베이스 프로젝트: `/Users/cho/Desktop/4141/utube-start` (포크)
> 작성자: bjcho9542@gmail.com
> 정책 가이드: 본 PRD의 모든 게이트·스키마·UI 결정은 [`YOUTUBE_POLICY.md`](./YOUTUBE_POLICY.md)를 1차 자료로 따른다. 정책 변경 시 그 문서를 먼저 갱신하고 본 PRD 해당 섹션을 동기화한다.

---

## 0. 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-04 | 초기 PRD 작성. 기술 스택 확정(Next.js 16 + Supabase + Google OAuth). 변환 파이프라인 5단계 + BGM 정책(영상 무음, 모바일 수동 추가) + 하이브리드 아키텍처(웹앱 컨트롤 플레인 + 로컬 CLI 실행 플레인) |
| 2026-05-04 | YOUTUBE_POLICY.md 동기화. 라이선스/Strike/Content ID 컬럼 추가, 정책 게이트 G1~G5 매핑, 검수 9항 체크리스트, 5대 리스크 표, 팀장별 정책 책임 명시 |
| 2026-05-06 | SaaS 전환: 카카오 로그인 + 토스페이먼츠 일반/구독결제 + 슈퍼어드민 테스트 로그인. 5팀 검토 권고 통합 (보안 [FAIL] 3건 차단 해제 / DB 동시성·인덱스·결제테이블·cost_ledger / 파이프라인 병렬화·idempotency / UX 9항 명세 / Phase 0 PoC + Phase 5→6 Go/No-go 게이트). §16 결제·§17 약관·§18 보안 신규. |

---

## 1. 개요

### 1.1 목표

사용자가 직접 큐레이션한 **(A) 100만뷰+ 한국 숏츠 + (B) 해외 원본 영상** 한 쌍을 받아, 일본어 나레이션·자막으로 현지화한 9:16 mp4를 생성하고 일본 YouTube 채널에 자동 업로드한다. 영상당 사용자 수동 개입 시간 **2분 이내** (페어 등록 1분 + BGM 추가 30초 + 공개 전환 30초).

### 1.2 사용자

일본 시장을 노리는 1인 숏츠 채널 운영자 (개발 경험 보유). 멀티 채널 운영. utube-start로 이미 한국 롱폼 4채널 운영 경험 있음.

### 1.3 설계 철학

> 별도 작업 예정.

### 1.4 시스템 구성 — 3개 플레인

```
[컨트롤 플레인]  Next.js 어드민 (Vercel 배포)
                 ↕
[데이터 플레인]  Supabase (Postgres + Auth + Storage + Realtime)
                 ↕
[실행 플레인]   로컬 Claude Code CLI (Mac, Demucs/FFmpeg/yt-dlp)
```

웹앱은 UI/메타데이터/상태만 다룸. 변환 작업은 로컬 CLI에서 실행 후 Supabase에 결과 push.

---

## 2. 인증 / 접근 제어 (신규)

### 2.1 정책

- **로그인 필수** — 비로그인 사용자는 랜딩 페이지만 접근, 대시보드 차단
- **Provider**: **Kakao OAuth** (Supabase Auth native provider)
- **접근 제어 (결제 게이트)**: `is_paid(auth.uid())` true 인 사용자만 `/dashboard/*` 접근
  - true 조건 (any): `role='superadmin'` / `email='bjcho9542@gmail.com'` / `paid_until > now()` / `subscription_status='active'`
- **결제 모델 (토스페이먼츠)**: 일반 ₩9,900 / 30일 1회 또는 정기 ₩9,900 / 월 자동결제
- **운영자 영구 무료**: `bjcho9542@gmail.com` 1명 (env로 관리)
- **신규 가입자**: 자동으로 `paid_until=null`, `subscription_status='none'` → `/dashboard/billing` 결제 후 즉시 접근
- **슈퍼어드민 테스트 로그인** (개발 전용):
  - `NEXT_PUBLIC_ALLOW_TEST_LOGIN=true` 환경에서만 `/api/auth/test-login` 활성화
  - role=superadmin 발급, 1시간 만료
  - production 빌드 가드: `next.config.ts`에서 `VERCEL_ENV='production'` 시 빌드 실패 처리
  - IP allowlist (로컬 + 운영자 IP)

### 2.2 로그인 모달 UX

```
[랜딩 페이지 / 또는 보호된 라우트 진입 시]
  ↓
  [모달] "카카오로 로그인"
   - "카카오로 계속하기" 버튼 (메인)
   - "[DEV] 슈퍼어드민 테스트 로그인" 버튼 (NEXT_PUBLIC_ALLOW_TEST_LOGIN=true에서만 노출)
   - 로그인 후 결제 게이트 체크 (is_paid())
     - true  → /dashboard 리다이렉트
     - false → /dashboard/billing 리다이렉트 (결제 안내)
  ↓
  [세션 유지] @supabase/ssr 쿠키 기반, 미들웨어에서 갱신
```

### 2.3 라우트 보호

| 라우트 | 권한 |
|---|---|
| `/` | 공개 (로그인 모달 트리거) |
| `/auth/callback` | 공개 (OAuth 콜백) |
| `/dashboard/*` (단, `/dashboard/billing` 제외) | 로그인 + 결제 게이트 (`is_paid()`) |
| `/dashboard/billing` | 로그인만 (결제 진행) |
| `/api/*` (어드민 API) | 로그인 + 결제 게이트 (서비스 키는 서버 전용) |
| `/api/payments/*` · `/api/billing/*` | 로그인 (결제 진행 중에는 게이트 우회) |
| `/api/webhooks/toss` | HMAC-SHA256 서명 검증 (`Toss-Signature` + `TOSS_WEBHOOK_SECRET`) |
| `/api/auth/test-login` | env 가드 (`NEXT_PUBLIC_ALLOW_TEST_LOGIN=true`) + IP allowlist |
| `/api/cli/*` (로컬 CLI 콜백) | Bearer 헤더 (constant-time 비교, `CLI_SHARED_SECRET`) + IP allowlist (`CLI_ALLOWED_IPS`) |

### 2.4 미들웨어 (`middleware.ts`)

- `@supabase/ssr` `createServerClient`로 세션 갱신
- `/dashboard/*` (단 `/dashboard/billing` 제외) 요청 시 세션 + `is_paid(auth.uid())` 체크
- 미인증 → `/?login=required` 리다이렉트
- 인증됐으나 미결제 → `/dashboard/billing?from=blocked` 리다이렉트
- production 환경에서 `NEXT_PUBLIC_ALLOW_TEST_LOGIN=true` 감지 시 `next.config.ts`가 빌드 실패 처리

---

## 3. 데이터베이스 스키마 (Supabase Postgres)

### 3.1 ERD 요약

```
auth.users ─┬─< profiles
            │
            └─< channels ─< shorts_pairs ─┬─< conversion_jobs
                                          ├─< bgm_recommendations
                                          ├─< agent_logs
                                          └─< uploads

channels ─< trending_sounds
```

### 3.2 테이블 정의

```sql
-- profiles: auth.users 확장
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  kakao_id text unique,                                -- 카카오 고유 ID
  role text not null default 'viewer'
    check (role in ('viewer','operator','admin','superadmin')),
  -- 결제 게이트
  paid_until timestamptz,                              -- 1회결제 만료 시각
  subscription_status text not null default 'none'
    check (subscription_status in ('none','active','past_due','canceled','expired')),
  active_subscription_id uuid,                         -- subscriptions.id (지연 FK, 16.x)
  created_at timestamptz not null default now()
);

-- is_paid 헬퍼: 결제 게이트 통과 여부
create or replace function is_paid(uid uuid) returns boolean
language sql stable as $$
  select exists(
    select 1 from profiles
    where id = uid
      and (role = 'superadmin'
           or email = 'bjcho9542@gmail.com'
           or paid_until > now()
           or subscription_status = 'active')
  );
$$;

-- channels: 운영하는 일본 YouTube 채널
create table channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,                        -- '일본채널A'
  slug text not null unique,                 -- 'jp-channel-a' (Storage 폴더명)
  description text,
  youtube_channel_id text,                   -- UC...
  -- oauth_refresh_token은 channel_credentials 테이블로 분리 (3.2.1) — pgsodium/Vault 암호화 + RLS deny
  default_voice_id text,                     -- ElevenLabs voice ID (가상 캐릭터 화이트리스트)
  default_subtitle_style jsonb,              -- ASS 스타일 프리셋
  -- Strike 관리 (YOUTUBE_POLICY §5)
  upload_paused boolean not null default false,        -- Strike 발생 시 자동 true
  cg_strike_count int not null default 0,              -- Community Guidelines strike (90일 윈도우)
  copyright_strike_count int not null default 0,
  last_strike_at timestamptz,
  last_strike_reason text,                             -- 'cg' | 'copyright' | 'spam' | 'reused'
  created_at timestamptz not null default now()
);

-- shorts_pairs: 한국 숏츠 + 원본 영상 페어 (변환 작업의 단위)
create table shorts_pairs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  korean_url text not null,                  -- 벤치마킹 한국 숏츠
  original_url text,                         -- 해외 원본 (없으면 한국 숏츠로 진행)
  korean_meta jsonb,                         -- { title, viewCount, channelTitle, duration, ... }
  original_meta jsonb,
  -- 라이선스 증빙 (YOUTUBE_POLICY §2.2 / G2.1 — DB 강제)
  license_source text not null
    check (license_source in ('cc','creator_permission','self_filmed')),
  license_evidence_url text not null,        -- CC 라이선스 페이지 URL / 허락 캡처 Storage URL / 본인 촬영 메타
  license_verified_at timestamptz,           -- 분석팀이 검증 완료한 시각
  license_verified_by uuid references profiles(id),
  status text not null default 'pending'
    check (status in ('pending','queued','processing','review','uploaded','published','failed')),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  selected_at timestamptz                    -- 사용자가 변환 큐에 넣은 시각
);

-- conversion_jobs: 변환 단계별 진행 로그
create table conversion_jobs (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references shorts_pairs(id) on delete cascade,
  stage text not null
    check (stage in ('download','stt','translation','tts','demucs','crop','subtitle','render','review')),
  status text not null default 'queued'
    check (status in ('queued','running','done','failed')),
  -- 동시성 (멀티채널 race 방지)
  claimed_by text,                           -- 워커 ID (channel_slug + hostname)
  claimed_at timestamptz,
  attempt int not null default 1,            -- 재시도 카운터 (KPI 합격률 측정)
  -- idempotency (재시도 시 ElevenLabs/Demucs 비용 중복 방지)
  input_hash text,                           -- 입력 hash (재사용 캐시 키)
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  artifact_path text,                        -- Supabase Storage 경로
  metadata jsonb                             -- { duration, fileSize, voice, ... }
);

create unique index conversion_jobs_pair_stage_attempt_idx
  on conversion_jobs(pair_id, stage, attempt);
create index shorts_pairs_channel_status_idx on shorts_pairs(channel_id, status);
create index shorts_pairs_status_created_idx on shorts_pairs(status, created_at);
create index uploads_content_id_pending_idx on uploads(content_id_status)
  where content_id_status = 'pending';
create index profiles_paid_until_idx on profiles(paid_until)
  where paid_until is not null;

-- bgm_recommendations: 분석팀장이 영상별로 자동 생성
create table bgm_recommendations (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references shorts_pairs(id) on delete cascade,
  rank int not null check (rank between 1 and 5),
  search_keyword text not null,              -- '「えぇ！？ SE」'
  usage_pattern text,                        -- '0:09 펀치라인 직전 효과음'
  mood_match text,                           -- '충격/반전'
  volume_guide int default 30                -- 25~40 권장
);

-- trending_sounds: 사용자가 매주 갱신하는 트렌딩 사운드 풀
create table trending_sounds (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  keyword text not null,
  category text,                             -- '충격' | '리액션' | '감동' | ...
  added_at timestamptz not null default now(),
  active boolean not null default true
);

-- agent_logs: 소통방 (utube-start의 agent_chat.json 대체)
create table agent_logs (
  id bigserial primary key,
  pair_id uuid references shorts_pairs(id) on delete cascade,
  channel_id uuid references channels(id) on delete cascade,
  from_actor text not null,                  -- '부장' | '검색팀장' | ...
  to_actor text not null,                    -- '대표' | '음성팀장' | ...
  type text not null check (type in ('command','report','gate','error')),
  message text not null,
  step int,
  created_at timestamptz not null default now()
);

create index agent_logs_pair_idx on agent_logs(pair_id, created_at desc);
create index agent_logs_channel_idx on agent_logs(channel_id, created_at desc);

-- uploads: YouTube 업로드 결과
create table uploads (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references shorts_pairs(id) on delete cascade,
  youtube_video_id text,                     -- 'ISHaniPAjiA'
  visibility text not null default 'unlisted'
    check (visibility in ('unlisted','public','private')),
  title text,
  description text,                          -- 표준 푸터(원본URL/원작자/AI고지) 자동 삽입 결과 포함
  tags text[],
  -- 정책 메타데이터 (YOUTUBE_POLICY §2.3 / §6 / G4.2~G4.4)
  altered_content boolean not null default true,  -- AI 합성 라벨 기본 true
  default_language text not null default 'ja',
  content_id_status text not null default 'pending'
    check (content_id_status in ('pending','none','monetize','block','takedown')),
  content_id_checked_at timestamptz,         -- 업로드 후 5분 내 fetch
  content_id_payload jsonb,                  -- raw claim 정보
  uploaded_at timestamptz,
  bgm_added boolean not null default false,  -- 사용자가 모바일에서 BGM 추가 완료 체크
  published_at timestamptz,
  metadata jsonb
);
```

#### 3.2.1 보안 격리 + 결제 + 비용 추적 (신규)

```sql
-- channel_credentials: OAuth refresh token 격리 (RLS deny + pgsodium/Vault 암호화)
create table channel_credentials (
  channel_id uuid primary key references channels(id) on delete cascade,
  oauth_refresh_token_encrypted bytea not null,
  encrypted_at timestamptz not null default now(),
  rotated_at timestamptz
);

-- payments: 토스페이먼츠 결제 기록
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
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

-- billing_keys: 정기결제 빌링키 (암호화)
create table billing_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  customer_key text unique not null,                  -- UUID 예측 불가
  billing_key_encrypted bytea not null,               -- pgsodium/Vault
  card_company text,
  card_last4 text,
  status text not null default 'active'
    check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- subscriptions: 구독 상태
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  billing_key_id uuid references billing_keys(id),
  plan text not null default 'standard',
  amount int not null default 9900,
  status text not null default 'active'
    check (status in ('active','past_due','canceled','expired')),
  next_charge_at timestamptz not null,
  last_charged_at timestamptz,
  failure_count int not null default 0,               -- 3회 실패 시 expired
  started_at timestamptz not null default now(),
  canceled_at timestamptz,
  expires_at timestamptz                              -- canceled 후 잔여 기간
);

-- refunds: 환불 기록
create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  cancel_reason text not null,
  cancel_amount int not null,
  status text not null default 'requested'
    check (status in ('requested','done','failed')),
  raw_response jsonb,
  requested_at timestamptz not null default now(),
  canceled_at timestamptz
);

-- cost_ledger: 영상당 API 비용 추적 (KPI 측정용)
create table cost_ledger (
  id bigserial primary key,
  pair_id uuid references shorts_pairs(id) on delete cascade,
  service text not null
    check (service in ('elevenlabs','llm','youtube','demucs','storage','toss')),
  units numeric,                                      -- chars / tokens / MB
  usd numeric,
  krw numeric,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index cost_ledger_pair_idx on cost_ledger(pair_id);

-- 인덱스 보강
create index payments_user_idx on payments(user_id, created_at desc);
create index subscriptions_next_charge_idx on subscriptions(next_charge_at)
  where status = 'active';
```

### 3.3 Row Level Security (RLS)

```sql
alter table profiles enable row level security;
alter table channels enable row level security;
alter table shorts_pairs enable row level security;
alter table conversion_jobs enable row level security;
alter table bgm_recommendations enable row level security;
alter table trending_sounds enable row level security;
alter table agent_logs enable row level security;
alter table uploads enable row level security;

-- profiles: 본인 row만 (결제 게이트 우회 — 본인 정보 항상 접근 가능)
create policy "own profile" on profiles for all
  using (auth.uid() = id);

-- channels: 소유자 + 결제 게이트 통과
create policy "own channels" on channels for all
  using (auth.uid() = owner_id and is_paid(auth.uid()));

-- shorts_pairs: 채널 소유자만
create policy "own pairs via channel" on shorts_pairs for all
  using (
    exists (select 1 from channels c
            where c.id = channel_id and c.owner_id = auth.uid())
  );

-- conversion_jobs / bgm_recommendations / agent_logs / uploads / cost_ledger:
-- pair → channel 소유자 + is_paid(auth.uid())
-- (exists join 두 단계, 모든 정책에 AND is_paid 결합)

-- 결제 테이블 RLS
alter table payments enable row level security;
alter table billing_keys enable row level security;
alter table subscriptions enable row level security;
alter table refunds enable row level security;
alter table cost_ledger enable row level security;
alter table channel_credentials enable row level security;

create policy "own payments select" on payments for select
  using (auth.uid() = user_id);
create policy "own subscriptions" on subscriptions for select
  using (auth.uid() = user_id);
create policy "own refunds" on refunds for select
  using (exists (select 1 from payments p where p.id = refunds.payment_id and p.user_id = auth.uid()));
-- billing_keys / channel_credentials: 전부 deny (서버 RPC 전용)
create policy "billing_keys deny" on billing_keys for all using (false);
create policy "creds deny" on channel_credentials for all using (false);
-- cost_ledger: 본인 채널 비용만
create policy "own cost" on cost_ledger for select using (
  exists (
    select 1 from shorts_pairs sp join channels c on c.id = sp.channel_id
    where sp.id = cost_ledger.pair_id and c.owner_id = auth.uid()
  )
);
```

### 3.4 트리거

```sql
-- auth.users 신규 가입 시 profiles 자동 생성
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

> ⚠️ `handle_new_user`는 `set search_path = public, pg_temp`를 명시하고 `EXCEPTION WHEN unique_violation THEN return new`로 idempotent 처리한다 (재실행 안전성).

### 3.5 Supabase Storage

| Bucket | 용도 | 공개 여부 |
|---|---|---|
| `media-input` | 다운로드한 한국 숏츠 + 원본 영상 | 비공개 |
| `media-artifacts` | 단계별 산출물 (분리된 BGM, TTS mp3, 자막 srt) | 비공개 |
| `media-output` | 최종 완성 mp4 | 비공개 |
| `thumbnails` | 첫 프레임 썸네일 (UI 미리보기용) | 공개 |

경로 규칙: `{channel_slug}/{pair_id}/{stage}/{filename}`

#### 3.5.1 Storage RLS 정책 (본문)

```sql
-- media-input/artifacts/output: 채널 소유자 + 결제 게이트
create policy "own media" on storage.objects for all using (
  bucket_id in ('media-input','media-artifacts','media-output')
  and (storage.foldername(name))[1] in (
    select c.slug from channels c
    where c.owner_id = auth.uid() and is_paid(auth.uid())
  )
);
-- thumbnails: 공개 read, 본인 write
create policy "thumb read" on storage.objects for select using (bucket_id = 'thumbnails');
create policy "thumb write" on storage.objects for insert with check (
  bucket_id = 'thumbnails' and (storage.foldername(name))[1] in (
    select c.slug from channels c where c.owner_id = auth.uid()
  )
);

-- channels.slug immutable (Storage 경로 무결성 보장)
create or replace function channels_slug_immutable() returns trigger
language plpgsql as $$
begin
  if old.slug is not null and old.slug <> new.slug then
    raise exception 'channels.slug is immutable (Storage path key)';
  end if;
  return new;
end; $$;
create trigger channels_slug_immutable_trg before update on channels
  for each row execute function channels_slug_immutable();
```

---

## 4. 시스템 아키텍처

### 4.1 3-플레인 흐름도

```
┌─ [컨트롤 플레인] Next.js 16 App Router on Vercel ──────────────────────┐
│                                                                          │
│  /login (모달)         /dashboard          /dashboard/research           │
│  /dashboard/pairs     /dashboard/upload    /dashboard/chat (실시간)      │
│                                                                          │
│  Server Actions: 페어 등록, 채널 관리, 트렌딩 사운드 갱신                │
│  API Routes:    /api/research (YouTube 검색), /api/cli/* (CLI 콜백)      │
└────────┬───────────────────────────────────────────────────┬────────────┘
         │                                                   │
         │ @supabase/ssr (브라우저 + 서버 클라이언트)         │ Service Role Key
         ▼                                                   ▼
┌─ [데이터 플레인] Supabase ────────────────────────────────────────────────┐
│                                                                            │
│  Postgres: profiles / channels / shorts_pairs / conversion_jobs            │
│            / bgm_recommendations / trending_sounds / agent_logs / uploads  │
│  Auth:     Google OAuth                                                    │
│  Storage:  media-input / media-artifacts / media-output / thumbnails       │
│  Realtime: agent_logs 구독 → /chat 실시간 표시                             │
└────────┬───────────────────────────────────────────────────┬──────────────┘
         │ Realtime 구독                                    │ Service Role 인증
         ▼                                                   ▼
┌─ [실행 플레인] 로컬 Mac / Claude Code CLI ────────────────────────────────┐
│                                                                            │
│  부장(Opus 4.7 메인 세션)                                                   │
│   ├─ Skill(youtube-pd-jp) 실행                                             │
│   ├─ shorts_pairs.status = 'queued' 페어 폴링                              │
│   └─ 팀장 서브 에이전트 소집                                                │
│                                                                            │
│  팀장 (검색/분석/번역/음성/편집/검수/업로드)                                │
│   ├─ MCP: YouTube / ElevenLabs / Supabase MCP                              │
│   └─ 로컬: yt-dlp / Demucs / FFmpeg 8.1 / Whisper / Pillow                 │
│                                                                            │
│  완료 시 conversion_jobs.status='done', agent_logs에 report 기록           │
└────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 멀티 채널 동시 실행

Ghostty 분할 터미널, 채널별 독립 Claude Code 세션. 각 세션은 본인이 담당하는 `channel_id`만 폴링 → 충돌 없음.

#### 4.2.1 race 방지 (claim 패턴)

```sql
-- 워커 픽업: SELECT FOR UPDATE SKIP LOCKED (또는 조건부 UPDATE)
update shorts_pairs
set status = 'processing'
where id = (
  select id from shorts_pairs
  where channel_id = $1 and status = 'queued'
  order by created_at
  for update skip locked
  limit 1
)
returning *;
```

**stale 워커 회수**: `processing` 상태 5분 초과 행은 cron이 `queued` 로 되돌리고 `claimed_by`/`claimed_at` 초기화 + `attempt += 1`.

```
┌──────────────────┬──────────────────┐
│ jp-channel-a     │ jp-channel-b     │
│ Claude → Skill   │ Claude → Skill   │
├──────────────────┼──────────────────┤
│ jp-channel-c     │ jp-channel-d     │
└──────────────────┴──────────────────┘
```

---

## 5. 변환 파이프라인 (5단계)

### 5.1 단계 요약

| # | 단계 | 주체 | 산출물 |
|---|---|---|---|
| ① | 발굴 | 사용자 (도구 제공) | 벤치마킹 한국 숏츠 N개 |
| ② | 페어 등록 | 사용자 | shorts_pairs row (한국+원본 URL) |
| ③ | 변환 | 부장 + 7팀장 | media-output mp4 (무음, 9:16) + BGM 추천 카드 |
| ④ | 검수+업로드 | 검수팀 + 업로드팀 | YouTube unlisted 영상 + uploads row |
| ⑤ | 공개 전환 | 사용자 (모바일 BGM 추가 후) → 자동 | 공개 전환 |

### 5.2 단계별 상세

#### ① 발굴 (사용자 직접)

- `/dashboard/research` 페이지에서 키워드 + 필터(조회수/구독자/댓글수/업로드일) 검색
- YouTube Data API v3 (`searchVideos`) 호출 → 숏츠 탭 한정
- 100만뷰+ 임계 사전 설정 가능
- 영상 카드 체크박스 → "벤치마킹 큐에 담기" 버튼

#### ② 페어 등록 (사용자 직접)

- 큐에 담긴 한국 숏츠 카드에 "원본 URL 입력" 입력란
- 사용자가 직접 찾은 원본 URL 입력 후 "변환 시작" 클릭
- shorts_pairs row 생성, status = 'queued'
- 원본 미입력 시 'queued (한국 숏츠 only)' 분기 — 자막 제거 단계 추가

#### ③ 변환 (부장 + 팀장)

```
shorts_pairs.status='queued' 감지
  ↓
부장: agent_logs에 command 기록 → 다운로드팀장 소집
  ↓
[다운로드]   yt-dlp로 한국 숏츠(A) + 원본(B) 받기 → media-input/
  ↓
[STT]       한국 숏츠(A) 음성 → Whisper로 한국어 자막 추출 (의미/타이밍 파악)
  ↓
[컷 타이밍]  ffprobe 씬 체인지 → cuts.json (벤치마킹의 핵심 = 편집 리듬)
  ↓
[번역]       한국어 자막 → 일본어 (의역 + 일본 숏츠 톤, GPT-4o or Claude)
  ↓
[음성 분리]  원본(B) → Demucs → vocals.wav + accompaniment.wav
             (사람 말소리 제거, BGM/SFX 보존)
  ↓
[TTS]        일본어 번역 → ElevenLabs eleven_multilingual_v2
             (timestamps 포함, 자막 싱크용)
  ↓
[9:16 크롭]  원본이 가로면 주체 트래킹 후 1080×1920 크롭
  ↓
[자막 합성]  ASS 자막 (큰 글씨 가운데 + 노란 강조) → ffmpeg subtitles 필터 번인
  ↓
[믹싱]       원본 BGM(보존) + 일본어 나레이션 → ffmpeg amix
             ※ 자체 BGM 추가는 절대 금지 (모바일 사운드 정책)
  ↓
[렌더]       1080×1920 H.264 CRF 18 AAC → media-output/{pair_id}/final.mp4
  ↓
[BGM 추천]   분석팀장: 원본 무드 분석 + trending_sounds 매칭
             → bgm_recommendations 3 row 생성
  ↓
검수팀장: 자막 가독성/번역 자연스러움/싱크/9:16 크롭 검증
  ↓
shorts_pairs.status = 'review'
```

**팀장-도구 매핑:**

| 팀장 | 도구 | 단계 |
|---|---|---|
| 다운로드팀장 | yt-dlp + Supabase Storage MCP | 다운로드 |
| 분석팀장 | YouTube MCP + LLM | 컷 타이밍 + BGM 추천 |
| 번역팀장 | LLM (Claude/GPT-4o) | 번역 |
| 음성팀장 | ElevenLabs MCP/REST + Demucs CLI | TTS + 분리 |
| 편집팀장 | FFmpeg 8.1 (subtitles 필터) | 크롭 + 자막 + 믹싱 + 렌더 |
| 검수팀장 | 없음 (Read만) | 검증 게이트 |

> 💡 **병렬화 그래프**: 다운로드 후 `[STT, Demucs, 컷타이밍, 9:16 크롭]` 4갈래 **병렬** 실행. 합류점은 자막 합성. KPI 5분 달성 근거.

> 💡 **idempotency (캐시 키)**: 각 stage는 `input_hash = sha256(stage_input_artifacts)` 계산 → 동일 입력 시 기존 `artifact_path` 재사용. 재시작 시 ElevenLabs / Demucs 비용 중복 0.

#### 5.2.1 단계별 실패 매트릭스

| stage | 실패 시나리오 | 대응 |
|---|---|---|
| download | yt-dlp 차단·삭제·지역제한 | 1회 재시도 → 실패 시 사용자 알림 (다른 원본 입력 요청) |
| stt | 음성 없는 숏츠 (BGM-only) | 빈 자막 진행, 번역 스킵 표시 |
| translation | LLM 타임아웃·검열 | Vercel AI Gateway 폴백 (Claude → GPT-4o) |
| demucs | SNR > -3dB (분리 부실) | 원본 풀오디오 fallback |
| tts | timestamps ↔ cuts 충돌 | cuts 우선, 음성 속도 ±10% 자동 조정 |
| crop | 입력이 이미 9:16 | bypass + 통과 |
| subtitle | 폰트 없음 (한↔일 글리프) | Noto Sans CJK fallback |
| render | ffmpeg 에러 | 1회 재시도 → 실패 |
| review | 인간 게이트 2·4 미통과 | 사용자 보강 후 재큐잉 (`attempt += 1`) |

3회 실패 시 `status='failed'` 고정 + 톡방 alert.

#### ④ 검수 + 업로드

- 검수팀 합격 조건 = **YOUTUBE_POLICY §6 영상별 9항 체크리스트 모두 통과** (G4.1)
  ```
  [ ] 1. (B) 원본 라이선스 증빙 첨부 (shorts_pairs.license_source/evidence_url)
  [ ] 2. 일본어 번역본에 원본에 없는 해설/코멘트 1개 이상  ← 인간 게이트
  [ ] 3. 동일 클립 연속 사용 < 5초 (편집팀 ffmpeg 자동 검사)
  [ ] 4. transformation 7개 중 4개 이상 적용              ← 인간 게이트
  [ ] 5. 자막 텍스트에 빨간딱지 키워드 0건 (정규식 자동)
  [ ] 6. 음성은 화이트리스트 voice ID (실존 인물 클론 X)
  [ ] 7. 제목/설명에 가짜 뉴스 키워드 (BREAKING/速報) 0건
  [ ] 8. 설명란 표준 푸터 자동 삽입 확인
  [ ] 9. 업로드 메타데이터 altered_content=true + defaultLanguage=ja
  ```
  1·3·5·6·7·8·9 자동 체크, **2·4만 인간 검수** (영상당 < 30초 목표)

- 합격 시 업로드팀장이 YouTube Data API `videos.insert`
- 업로드 옵션: `privacyStatus='unlisted'`, `defaultLanguage='ja'`, `altered_content=true`
- 메타데이터 자동 생성: 일본어 제목/설명/태그/해시태그 (LLM, 가짜 뉴스 키워드 정규식 차단)
- 설명란 표준 푸터 자동 삽입 (YOUTUBE_POLICY §2.5):
  ```
  元動画: {original_url}  /  原作者: {original_meta.channelTitle}
  日本語ナレーション: AI生成 (ElevenLabs)
  #shorts #日本語
  ```
- uploads row 생성 (visibility='unlisted', altered_content=true, content_id_status='pending')
- **업로드 직후 5분 이내 Content ID 결과 polling** (G4.3) → `content_id_status` 갱신
  - `monetize` → 그대로 진행
  - `block` / `takedown` → unlisted 유지 + 에스컬레이션 알림, 공개 전환 차단
- shorts_pairs.status = 'uploaded'

#### ⑤ 공개 전환

- `/dashboard/upload` 페이지: unlisted 영상 + BGM 추천 카드 + 모바일 체크리스트 표시
- 사용자가 폰에서 BGM 추가 완료 → "BGM 추가 완료" 체크
- 체크 시 Server Action: YouTube API `videos.update`로 `privacyStatus: 'public'`
- uploads.bgm_added = true, visibility = 'public', published_at 기록
- shorts_pairs.status = 'published'

---

## 6. 어드민 대시보드

### 6.1 페이지 구성

| 경로 | 용도 | 재활용/신규 |
|---|---|---|
| `/` | 랜딩 (로그인 모달 트리거) | 신규 |
| `/auth/callback` | Google OAuth 콜백 | 신규 |
| `/dashboard` | 홈 — 진행 중 영상 / 최근 완료 / 채널 통계 | utube-start 재활용 |
| `/dashboard/settings` | API 키 / 채널 프로필 / 트렌딩 사운드 풀 | utube-start 재활용 (Supabase 저장으로 변경) |
| `/dashboard/research` | YouTube 숏츠 검색 + 필터 + 체크박스 큐잉 | utube-start 재활용 |
| `/dashboard/pairs` | 페어 등록 (한국+원본 URL 입력) — **신규** | 신규 |
| `/dashboard/production` | 변환 진행률 + 단계별 산출물 미리보기 | utube-start 재활용 |
| `/dashboard/upload` | unlisted 영상 + **YOUTUBE_POLICY §6 9항 체크리스트 UI** + BGM 추천 카드 + Content ID 상태 + 공개 전환 | utube-start 재활용 + 정책 체크박스 신규 |
| `/dashboard/billing` | 결제 (일반/구독 선택) + 사용 기간·다음 결제일 + 영수증·해지 | **신규 (SaaS)** |
| `/dashboard/chat` | 소통방 (Realtime 구독, agent_logs 표시) | utube-start 재활용 (DB 기반으로 변경) |
| `/dashboard/analytics` | 업로드 영상 조회수/구독자 추이 | 추후 |

#### 6.1.1 9항 체크리스트 UI 명세 (인간 게이트 2·4)

`/dashboard/upload` 카드별 모달:
- **상단**: 원본(B) 영상 ↔ 일본어 번역본 side-by-side 플레이어 (싱크 재생)
- **체크 2 (해설)**: 번역 자막 위에 사용자가 추가한 해설 라인 ≥1개 — 인라인 입력 + 카운터
- **체크 4 (transformation)**: 7개 라벨 토글 (자막/번역해설/속도/크롭/컷재배열/SE/BGM정책준수) — ≥4 (첫 30편은 ≥5)
- **자동 체크 (1·3·5·6·7·8·9)**: green/red 배지로 상단 표시
- **30초 타이머**: UX 목표 표시, 초과 시 알림 (강제 X)
- 합격 시 "업로드" 버튼 활성화

### 6.2 API 라우트

| 경로 | 용도 | 인증 |
|---|---|---|
| `/api/research` | YouTube Data API 검색 | 세션 |
| `/api/oauth/youtube/start` | YouTube 업로드 OAuth 시작 | 세션 |
| `/api/oauth/youtube/callback` | OAuth 콜백 → channels.oauth_refresh_token 저장 | 세션 |
| `/api/cli/jobs/poll` | CLI가 queued 페어 폴링 (`for update skip locked`) | Bearer + IP allowlist |
| `/api/cli/jobs/[id]/update` | CLI가 단계별 진행 보고 | Bearer + IP allowlist |
| `/api/cli/logs` | CLI가 agent_logs insert | Bearer + IP allowlist |
| `/api/payments/confirm` | 토스 결제 승인 (서버 amount 검증) | 세션 |
| `/api/payments/cancel` | 환불 처리 | 세션 |
| `/api/billing/issue` | 빌링키 발급 | 세션 |
| `/api/billing/charge` | 자동결제 cron 실행 | 내부 (Vercel Cron) |
| `/api/webhooks/toss` | 토스 Webhook (HMAC-SHA256 서명 검증) | 서명 검증 |
| `/api/auth/test-login` | 슈퍼어드민 테스트 로그인 | env 가드 + IP allowlist |

### 6.3 Server Actions (App Router)

- `signInWithKakao()` — Supabase Kakao OAuth
- `signInWithTestSuperadmin()` — DEV 전용 (env 가드)
- `enqueuePair(channelId, koreanUrl, originalUrl)` — shorts_pairs insert
- `updateTrendingSounds(channelId, sounds[])` — 주간 갱신
- `confirmBgmAdded(uploadId)` — bgm_added=true + YouTube API 공개 전환
- `startOneTimePayment()` / `startSubscription()` — 토스 결제창 호출
- `cancelSubscription(subscriptionId)` — 구독 해지 (다음 결제일 전)
- `requestRefund(paymentId, reason)` — 환불 요청

---

## 7. 조직도

> 별도 작업 예정.

---

## 8. 시스템 구성

> 별도 작업 예정.

---

## 9. 외부 의존성

### 9.1 API 키 (5개)

| # | 서비스 | 용도 | 환경변수 |
|---|---|---|---|
| 1 | Supabase | 인증 + DB + Storage + Realtime | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| 2 | Kakao OAuth | 로그인 (Supabase Provider 등록) | `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` (Supabase 측 + 환경변수 백업) |
| 3 | YouTube Data API v3 | 검색 + 업로드 | `YOUTUBE_API_KEY` (검색용), `YOUTUBE_OAUTH_CLIENT_ID/SECRET` (업로드용) — **채널마다 별도 GCP 프로젝트 권고** |
| 4 | ElevenLabs | 일본어 TTS | `ELEVENLABS_API_KEY` |
| 5 | LLM (번역) | Claude or OpenAI | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` |
| 6 | 토스페이먼츠 | 결제 (일반/정기) + Webhook | `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, `TOSS_WEBHOOK_SECRET` |
| 7 | CLI 인증 | `/api/cli/*` Bearer | `CLI_SHARED_SECRET`, `CLI_ALLOWED_IPS` |
| 8 | 슈퍼어드민 테스트 | `/api/auth/test-login` env 가드 | `NEXT_PUBLIC_ALLOW_TEST_LOGIN` (development만) |

### 9.2 로컬 프로그램 (실행 플레인)

| 프로그램 | 버전 | 용도 |
|---|---|---|
| FFmpeg | 8.1 (subtitles 필터 포함) | 크롭/자막/믹싱/렌더 |
| yt-dlp | 최신 | YouTube 다운로드 |
| Demucs | 4.x | 음성-BGM 분리 |
| Whisper (faster-whisper) | 최신 | 한국어 STT |
| Python 3.x | system | Demucs/Whisper 실행 |
| Node.js LTS | 24+ | Next.js + CLI 워커 |

### 9.3 MCP 서버 (.mcp.json)

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "@kirbah/mcp-youtube"],
      "env": { "YOUTUBE_API_KEY": "${YOUTUBE_API_KEY}" }
    },
    "elevenlabs": {
      "command": "npx",
      "args": ["-y", "@angelogiacco/elevenlabs-mcp-server"],
      "env": { "ELEVENLABS_API_KEY": "${ELEVENLABS_API_KEY}" }
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

---

## 10. 실행 흐름 예시 (가상 1편)

```
[1] 사용자: /dashboard/research 에서 "해외 유머" 검색, 100만뷰+ 필터
    → 8개 한국 숏츠 카드 표시 → 3개 체크박스 선택 → "큐에 담기"

[2] 사용자: /dashboard/pairs 에서 첫 번째 카드의 "원본 URL" 입력란에
    https://www.tiktok.com/@xxx/video/123 붙여넣기 → "변환 시작"
    → shorts_pairs row 생성, status='queued'

[3] 로컬 CLI (Ghostty 'jp-channel-a' 세션):
    부장이 5초마다 폴링 → 신규 페어 발견 → agent_logs에 command 기록
    → Skill(youtube-pd-jp) 실행

[4] 부장 → 다운로드팀장:
    yt-dlp로 A, B 받음 → media-input/{pair_id}/A.mp4, B.mp4

[5] 부장 → 분석팀장:
    A의 ffprobe 씬 체인지 추출 → cuts.json (5컷)
    A의 STT → 한국어 자막 추출
    원본 무드 분석: "충격/반전 + 0:09 펀치라인"
    bgm_recommendations 3 row 생성

[6] 부장 → 번역팀장:
    한국어 자막 → 일본어 의역 (5컷에 매핑)

[7] 부장 → 음성팀장:
    Demucs로 B 분리 → vocals.wav 폐기, accompaniment.wav 보존
    ElevenLabs로 일본어 TTS 5세그먼트 + timestamps

[8] 부장 → 편집팀장:
    B를 9:16 크롭 + cuts.json 적용
    ASS 자막 (큰 글씨 가운데 노란 강조) 번인
    accompaniment.wav + 일본어 TTS amix
    렌더 → media-output/{pair_id}/final.mp4 (15초, 1080×1920, 8MB)

[9] 부장 → 검수팀장:
    가독성/번역/싱크/크롭 검증 → 합격

[10] 부장 → 업로드팀장:
     YouTube Data API videos.insert
     privacyStatus='unlisted', defaultLanguage='ja'
     uploads row 생성, youtube_video_id='abc123'

[11] 사용자: /dashboard/upload 페이지에서 카드 확인
     BGM 추천 카드: "「えぇ！？ SE」" 검색어 표시
     → 폰에서 YouTube 앱 → 사운드 추가 → 검색어 입력 → 트렌딩 선택
     → 어드민에서 "BGM 추가 완료" 체크

[12] Server Action: videos.update privacyStatus='public'
     uploads.bgm_added=true, visibility='public', published_at=now()
     shorts_pairs.status='published'
```

총 사용자 시간: 약 1분 50초 (큐잉 30초 + 페어 등록 30초 + BGM 30초 + 공개 20초)
총 자동 처리 시간: 약 3~5분 (변환 파이프라인)

---

## 11. 기술 스택

```
[프론트엔드]
  Framework      : Next.js 16 App Router (Server Components 우선)
  Styling        : Tailwind CSS v4 + shadcn/ui
  Auth           : @supabase/ssr (Kakao OAuth + DEV 전용 슈퍼어드민 테스트 로그인)
  결제           : 토스페이먼츠 SDK (Payment Widget v2) + 빌링키 (서버 cron)
  Realtime       : @supabase/supabase-js Realtime channel (agent_logs 구독)
  배포           : Vercel (Fluid Compute)

[백엔드 — 컨트롤 플레인]
  API            : Server Actions + Route Handlers
  DB Client      : @supabase/supabase-js (browser) + @supabase/ssr (server)
  외부 API       : YouTube Data API v3, Vercel AI Gateway 경유 (LLM 폴백)

[데이터 플레인]
  DB             : Supabase Postgres + RLS
  Storage        : Supabase Storage (media-input/artifacts/output/thumbnails)
  Auth           : Supabase Auth + Google Provider
  Realtime       : Supabase Realtime (Postgres replication)

[실행 플레인 — 로컬 Mac]
  Orchestrator   : Claude Code Opus 4.7 (1M context)
  Skill          : .claude/commands/youtube-pd-jp.md
  팀장           : agents/*.md (9개)
  미디어 처리    : FFmpeg 8.1 / yt-dlp / Demucs / faster-whisper
  MCP            : YouTube / ElevenLabs / Supabase

[Vercel 활용]
  - Vercel Functions (Fluid Compute) for API routes
  - Vercel AI Gateway for LLM 라우팅 (번역 단계)
  - Vercel Blob 미사용 (Supabase Storage 사용)
  - Vercel Sandbox (옵션) — 추후 클라우드 변환 워커 분리 시 검토
```

---

## 12. 성공 지표 (KPI)

| 지표 | 목표 | 측정 방법 |
|---|---|---|
| 영상당 사용자 수동 시간 | < 2분 (변환만) / 발굴+페어 30분/일 5편 | 페어 등록 + BGM 추가 + 공개 전환 합산 (client timing event) |
| 변환 자동 처리 시간 | < 5분 (15초 영상 기준) | conversion_jobs 시작~종료 |
| 영상당 API 비용 | **< $1.0** (실측 보수) | `cost_ledger` 합산 |
| 1차 검수 합격률 | > 80% | `conversion_jobs.attempt=1 AND status=done` 비율 |
| 주간 처리량 | **30편/주 (1차 출시)** → 100편/주 (안정화) | 채널×4 × 8편/주 |
| 결제 전환율 | 추후 측정 | 가입 → /billing 결제 비율 |
| 월 활성 구독 (MAS) | 추후 측정 | `subscriptions.status='active'` 카운트 |
| 일본 채널 평균 조회수 | 출시 후 4주 시점 측정 | YouTube Analytics |

---

## 13. 리스크 + 대응

### 13.1 정책 리스크 (YOUTUBE_POLICY §2 — 5대 리스크)

| 리스크 | 우선순위 | 대응 |
|---|---|---|
| **🔴 Reused Content (재사용 콘텐츠)** | 1위 (2026 demonetize 사유 1위) | G3.1 (원본에 없는 해설 ≥1개), G3.5 (transformation ≥4), 검수 9항 인간 게이트 2·4. 단순 번역만으로는 통과 불가 |
| **🔴 저작권 / Content ID** | 2위 | G2.1 라이선스 증빙 DB NOT NULL 강제 (CC/허락/본인촬영), G3.2 동일 클립 < 5초, G4.3 unlisted 후 5분 내 Content ID polling, block/takedown 시 공개 차단 |
| **🟡 AI 생성 콘텐츠 미공개** | 3위 | uploads.altered_content=true 기본값, 설명 푸터에 일본어 AI 고지 자동 삽입, voice ID 화이트리스트(가상 캐릭터)만 — 실존 인물 클론 차단 |
| **🟡 광고 친화 가이드라인 (AFG)** | 4위 (Shorts는 더 민감) | G3.4 빨간딱지 키워드 정규식 자동 차단, 번역팀 톤 다운 가이드, 발굴 단계에서 민감 주제(`military|war|abortion|suicide`) 사전 거부 |
| **🟡 스팸·오인 메타데이터** | 5위 (즉시 종료 트랙) | 제목/설명 가짜 뉴스 키워드(BREAKING/速報/独占) 정규식 차단, 썸네일은 원본 첫 프레임 자동만 사용 — 합성 썸네일 금지 |
| **Strike 누적 → 채널 종료** | (정책 운영) | channels.cg_strike_count/copyright_strike_count polling, strike 발견 즉시 upload_paused=true, 멀티 채널 격리로 blast radius 제한 |

### 13.2 기능 리스크

| 리스크 | 대응 |
|---|---|
| **번인 한국 자막 잔존** | 원본(B) 사용으로 회피. B 없는 경우만 발생 → 자막 위치 사전 검사 게이트 + Video-Subtitle-Remover fallback |
| **Demucs 분리 실패 (사람 말소리 잔존)** | SNR 게이트로 측정 → 실패 시 원본 풀오디오 fallback (BGM에 일본어 나레이션 덮어씀) |
| **TTS 부자연스러움** | 채널별 voice 후보 풀 관리 + ElevenLabs `eleven_multilingual_v2` 권장 |
| **YouTube API 일일 쿼터 (10,000)** | 검색은 캐싱 + 업로드는 1편당 ~1,600 unit → 1일 6편 한계, 채널별 별도 키 발급 |
| **Supabase Storage 용량 (무료 1GB)** | media-input/artifacts는 변환 완료 후 7일 후 자동 삭제 (cron) |
| **로컬 CLI 다운 시 작업 정지** | shorts_pairs.status='processing' 5분 이상 → 부장 재시작 시 자동 재개 |
| **OAuth refresh token 만료** | 만료 감지 → 어드민 알림 + /dashboard/settings 재인증 버튼 |
| **API 키 노출** | utube-start 교훈 → `.mcp.json` git ignore + Supabase Vault 활용 + pre-commit gitleaks |
| **`oauth_refresh_token` 평문 저장** | `channel_credentials` 테이블 분리 + pgsodium/Vault 암호화 + RLS deny |
| **Storage 용량 폭발** | 100편/주×30MB×4ch = 12GB/월. Phase 1 시점 Supabase **Pro 전환 필수** + 7일 cron 정리 |

### 13.3 결제 리스크 (신규)

| 리스크 | 대응 |
|---|---|
| **결제 실패 (카드 한도/3D 인증)** | 1회 재시도 → 실패 시 결제 화면 유지·알림 |
| **중복결제** | `orderId` UNIQUE + 클라이언트 5초 disable lock |
| **빌링키 분실/유출** | pgsodium 암호화 + customerKey UUID 예측 불가, 유출 감지 시 즉시 revoke |
| **자동결제 실패 누적** | 3회 연속 실패 → `subscription_status='past_due'` → 7일 후 `expired` |
| **카드 만료 (next_charge_at 시점)** | 토스 INVALID_CARD 응답 → 이메일·인앱 빌링키 재등록 요청 |
| **Webhook 재전송 멱등성** | `payment_key + status` 조합 dedup, 동일 이벤트 1회만 처리 |
| **PG 장애 (토스 다운)** | 결제 화면 안내 + 큐 보류, Webhook 재시도(7회)로 복구 |
| **사전고지 누락 (정기결제)** | 가격 변경 30일 전 이메일 + 어드민 토글 차단 (전자상거래법 §20조의2) |
| **CSRF / OAuth 콜백 위조** | `state` 파라미터 + `redirect_uri` 정확 매칭 + 가능 시 PKCE |

---

## 14. 구현 로드맵

### Phase 0: PoC (정책·기술 리스크 조기 검증)
별도 디렉토리 `/Users/cho/Desktop/4141/poc-jp` — utube-start 포크 전 작업.
- [ ] Demucs 음성 분리 SNR 게이트 임계값 측정 (한국 숏츠 10편)
- [ ] 9:16 주체 트래킹 알고리즘 — 가로영상 5편 변환 → 주체 위치 정확도
- [ ] ASS 자막 한·일 폰트 (Noto Sans CJK / M PLUS 1p) 글리프 호환 검증
- [ ] ElevenLabs 일본어 voice 후보 1~3개 비교 시청
- [ ] FFmpeg 8.1 subtitles 필터 + 9:16 + amix 파이프라인 1편 end-to-end (수동)
- [ ] **킬 스위치**: PoC 결과 1개라도 미해결 → Phase 1 진입 보류

### Phase 1: 베이스 구축
- [ ] utube-start 포크 → utube-shorts-jp
- [ ] 불필요 모듈 제거 (이미지팀, 썸네일, CHARACTER_SHEET, 대본팀)
- [ ] Next.js 16 업그레이드 + Tailwind v4 확인
- [ ] Supabase 프로젝트 생성 + 마이그레이션 실행
- [ ] Supabase Storage 버킷 4개 생성 + RLS 정책 적용

### Phase 2: 인증 + 화이트리스트
- [ ] Supabase Auth Google Provider 설정
- [ ] @supabase/ssr 미들웨어 + 서버/브라우저 클라이언트 분리
- [ ] 로그인 모달 컴포넌트
- [ ] profiles 트리거 + whitelisted 체크
- [ ] 초기 화이트리스트 (`bjcho9542@gmail.com`) 등록

### Phase 3: 어드민 핵심 페이지
- [ ] /dashboard 홈 + 채널 통계
- [ ] /dashboard/research (utube-start 재활용 + Supabase 저장)
- [ ] /dashboard/pairs (신규 — 한국+원본 URL 입력)
- [ ] /dashboard/settings (트렌딩 사운드 풀 관리 추가)

### Phase 4: 변환 파이프라인 (실행 플레인)
- [ ] CLI 폴링 워커 (`cli/poll.ts`)
- [ ] 다운로드팀 (yt-dlp + Storage 업로드)
- [ ] 번역팀 (Vercel AI Gateway 경유)
- [ ] 음성팀 (ElevenLabs + Demucs CLI 래퍼)
- [ ] 편집팀 (9:16 크롭 + 컷 타이밍 매칭 + ASS 자막)
- [ ] 검수팀 (4가지 게이트)
- [ ] BGM 추천 (분석팀 출력 추가)

### Phase 5: 자동 업로드
- [ ] YouTube OAuth 플로우 (`channel_credentials` 암호화 저장)
- [ ] 업로드팀 (videos.insert unlisted)
- [ ] /dashboard/upload UI + BGM 추천 카드
- [ ] 공개 전환 Server Action

### Phase 5 → 6 사이: Go/No-go 게이트 SOP (신규)

Phase 5 완료 시점에 **첫 10편 unlisted 업로드 → 5분 polling**. 결과로 사업 진행 여부 결정.

| 지표 | 임계값 | 미달 시 조치 |
|---|---|---|
| Content ID `block`/`takedown` 비율 | < 30% | 30%↑ → **사업 모델 재설계** (license_source 화이트리스트 강화) |
| 검수 인간 게이트 2·4 합격률 | > 60% | 60%↓ → transformation 5개 강제 + 번역 톤 재학습 |
| 평균 변환 자동 처리 시간 | < 5분 | 미달 시 §5.2 병렬화 강화 |
| Strike 발생 | 0 | 1회 발생 시 1주 대기 + 어필 |

4개 모두 통과 → Phase 6 진입. 1개라도 실패 → 해당 영역 수정 후 5편 재테스트.

### Phase 6: 운영 안정화
- [ ] Realtime 소통방 (/chat)
- [ ] 멀티 채널 동시 실행 검증
- [ ] Storage 자동 정리 cron
- [ ] /analytics 페이지 (KPI 측정)

---

## 15. 미해결 의사결정 TODO

사용자가 결정해줘야 할 항목:

### 기능

- [ ] 일본어 voice ID — Phase 0 PoC에서 1~3개 후보 비교 후 선정
- [ ] 일본 채널 명칭 N개 (slug 포함) + **채널마다 별도 Gmail + 별도 GCP 프로젝트** (blast radius)
- [ ] 자막 폰트 — Noto Sans CJK / M PLUS 1p / 기타?
- [ ] 트렌딩 사운드 풀 초기 5개 (`trending_sounds` seed)
- [ ] 주간 처리량 목표 — 1차 30편/주 (consultant 권고, 100편 번아웃 위험 90%)
- [ ] 번역 LLM — Claude vs GPT-4o (Vercel AI Gateway에서 폴백 순서)
- [ ] Supabase 플랜 — Phase 1 시점 **Pro 전환 (Free 1GB 첫주 폭발)**
- [ ] 결제 가격 차등화 — 일반 ₩9,900 / 30일 vs 구독 ₩7,900~9,900 / 월 (구독 인센티브 검토)
- [ ] 카카오 비즈앱 검수 시점 — 이메일 필수 동의 필요 시
- [ ] 원본 미입력 시 정책 — 한국 숏츠로 진행 vs 변환 거부

### 정책 (YOUTUBE_POLICY §9 동기화)

- [ ] (B) 원본 라이선스 — **1차 출시: CC + self_filmed만 허용**, `creator_permission`은 Phase 6 이후 정식 계약서 템플릿 완비 후
- [ ] G3.5 transformation 합격선 — **첫 30편 5개 강제** 후 데이터 보고 4개 완화 검토
- [ ] 권리자 컨택 템플릿 — 일본어/한국어/영어
- [ ] 채널별 voice ID 화이트리스트 초기 셋
- [ ] 빨간딱지 키워드 정규식 한국어/일본어 각 50개

- [ ] Strike 발생 시 자동 정지 범위 — 발생 채널만(현재 PRD 기본값) vs 전체 채널 일괄 정지?
- [ ] 가짜 뉴스 키워드 정규식 셋 — 일본어 `速報|独占|衝撃` 등 정확한 셋 확정

---

## 부록 A: utube-start 자산 재활용 매트릭스

| 항목 | utube-start 위치 | 재활용도 | 비고 |
|---|---|---|---|
| CLAUDE.md 부장 패턴 | `/CLAUDE.md` | 95% | 일본 시장 항목만 추가 |
| 게이트 시스템 | `/lib/gates.ts` | 80% | DB 기반으로 변경 |
| 소통방 로그 | `agent_chat.json` (파일) | 70% | `agent_logs` 테이블로 전환 |
| 채널 격리 | `output/{채널}/` | 50% | Supabase Storage 경로로 전환 |
| .mcp.json | `/.mcp.json` | 90% | Supabase MCP 추가 |
| Next.js 골격 | `/src/app/` | 80% | App Router 유지, `@supabase/ssr` 추가 |
| /research 페이지 | `/src/app/research/` | 95% | 그대로 |
| /upload 페이지 | `/src/app/upload/` | 60% | BGM 추천 카드 + 공개 전환 추가 |
| ElevenLabs 우회 | (음성팀 노하우) | 100% | 일본어 voice만 교체 |
| FFmpeg 빌드 패턴 | (편집팀 노하우) | 70% | 9:16 + 컷 타이밍 매칭 추가 |

| 항목 | 신규 |
|---|---|
| Supabase Auth (Google) | 신규 |
| RLS 정책 | 신규 |
| 페어 등록 페이지 | 신규 |
| 다운로드팀 | 신규 |
| 번역팀 | 신규 |
| 자동 업로드 (OAuth) | 신규 |
| Demucs 음성 분리 | 신규 |
| 9:16 크롭 모듈 | 신규 |
| 컷 타이밍 추출 | 신규 |
| BGM 추천 카드 | 신규 |
| Realtime 소통방 | 신규 |

---

## 부록 B: 핵심 원칙 (지켜야 할 것)

1. **100% 자동화하지 않는다** — 발굴/페어 등록/BGM 추가는 사용자 판단
2. **영상에 BGM 절대 합성 금지** — Shorts 모바일 사운드 정책 준수
3. **만드는 AI ≠ 검토하는 AI** — 검수 단계 독립
4. **Service Role Key 클라이언트 노출 금지** — 서버 전용 환경변수
5. **저작권 추적** — uploads.metadata에 원본 URL 의무 기록
6. **로컬 CLI = 단일 진실의 원천 (실행)** — 웹앱은 상태 표시만
7. **사용자 입력은 React 기본 escape 의존** — `dangerouslySetInnerHTML` 절대 금지
8. **결제·시크릿은 서버 전용** — `NEXT_PUBLIC_*` 접두사 검증 + pre-commit gitleaks

---

## 16. 결제 / 구독 (토스페이먼츠)

### 16.1 정책

- **일반결제**: ₩9,900 / 30일 1회. `payments.status='DONE'` 시 `profiles.paid_until = now() + interval '30 days'`
- **정기결제**: ₩9,900 / 월 자동. 빌링키 발급 후 매월 같은 날짜 자동결제 (서버 cron). `subscriptions.status='active'` 동안 `is_paid()` true
- **운영자 영구 무료**: `bjcho9542@gmail.com` 또는 `role='superadmin'`은 결제 게이트 우회

### 16.2 일반결제 흐름

```
[프론트] /dashboard/billing
  ↓ TossPayments SDK clientKey 초기화
  ↓ requestPayment({ orderId=UUID, amount=9900, orderName='30일 이용권', successUrl, failUrl })
  ↓ 카드사 인증
  ↓ successUrl?paymentKey=&orderId=&amount=
[서버] POST /api/payments/confirm
  ↓ DB orderId·amount 검증 (위조 방지)
  ↓ POST https://api.tosspayments.com/v1/payments/confirm  (Authorization: Basic Base64(secretKey:))
  ↓ 응답 status='DONE' 검증
  ↓ payments INSERT + profiles.paid_until UPDATE
  ↓ /dashboard 리다이렉트
```

### 16.3 정기결제 흐름 (빌링키)

```
[발급]
[프론트] BillingAuth widget 또는 카드 입력 폼
  ↓ POST /api/billing/issue { customerKey=UUID, cardInfo }
[서버] POST /v1/billing/authorizations/card
  ↓ 응답 billingKey, customerKey
  ↓ pgsodium 암호화 → billing_keys INSERT
  ↓ subscriptions INSERT (status='active', next_charge_at=now()+1month)
  ↓ 즉시 첫 결제 실행

[자동결제 cron — 매일 00:00 KST, Vercel Cron 또는 Supabase Edge Function]
SELECT id FROM subscriptions WHERE status='active' AND next_charge_at <= now()
  ↓ 각 row마다 POST /v1/billing/{billingKey} (customerKey, amount, orderId, orderName)
  ↓ 성공 → payments INSERT + next_charge_at += 1month + last_charged_at=now()
  ↓ 실패 → failure_count += 1
       1회 → 다음날 재시도
       3회 → status='past_due' → 7일 후 'expired'
```

### 16.4 Webhook 서명 검증

```
[Toss → POST /api/webhooks/toss]
  Header: Toss-Signature: v1:<base64>
  Body  : { eventType, data, ... }

[서버]
  expected = HMAC-SHA256(`{body_raw}:{transmissionTime}`, TOSS_WEBHOOK_SECRET)
  actual   = base64decode(signature.split('v1:')[1])
  if (!constant_time_eq(expected, actual)) return 401
  → 이벤트 타입별 처리:
    - PAYMENT_STATUS_CHANGED.DONE     → payments UPDATE
    - PAYMENT_STATUS_CHANGED.CANCELED → refunds UPDATE
  → HTTP 200 (10초 내, 미반환 시 재시도 7회)
  → 멱등성: payment_key + status dedup
```

### 16.5 환불 흐름

```
[사용자] /dashboard/billing → 환불 버튼
  ↓ POST /api/payments/cancel { paymentId, cancelReason, cancelAmount? }
[서버] 환불 정책 검증 (docs/REFUND.md):
  - 일반결제: 사용 시작 전 100% / 후 비례 (변환 1편당 10% 차감)
  - 정기결제: 7일 내 100% (변환 0편 조건) / 7일 후 일할 계산
  ↓ POST /v1/payments/{paymentKey}/cancel
  ↓ 응답 검증 → refunds INSERT + payments UPDATE + paid_until 조정
```

### 16.6 정기결제 사전고지 (전자상거래법 §20조의2)

- 정기결제 가격 변경 또는 무료→유료 전환 시 **30일 전 이메일·인앱 알림**
- 별도 동의 없이 변경 금지
- 어드민 UI에 "고지 진행률" 토글 + 변경 발효일 차단

### 16.7 테스트 환경

- **테스트 키 즉시 발급**: developers.tosspayments.com 회원가입 (사업자번호 불필요)
- 키 접두사: `test_` (clientKey: `test_gck_...` / secretKey: `test_gsk_...`)
- Sandbox UI: developers.tosspayments.com/sandbox — 코드 없이 paymentKey 발급 가능
- 실제 카드 정보 입력해도 가상 승인 (출금 없음)
- **DEV 흐름**: 슈퍼어드민 테스트 로그인 → /dashboard/billing → 토스 테스트 키 → 결제 end-to-end 검증

---

## 17. 약관 / 개인정보 / 환불 정책

본 PRD의 사용자 동의·개인정보 수집·환불 규칙은 별도 문서를 참조한다.

| 문서 | 경로 | 내용 |
|---|---|---|
| 이용약관 | [`docs/TERMS.md`](./docs/TERMS.md) | 회원·콘텐츠 책임·면책·분쟁 |
| 개인정보처리방침 | [`docs/PRIVACY.md`](./docs/PRIVACY.md) | 수집 항목·보유 기간·제3자 제공 |
| 환불정책 | [`docs/REFUND.md`](./docs/REFUND.md) | 청약철회·일반/정기 환불 비율·환불 절차 |

세 문서 모두 **한국 SaaS 표준 1차 작성**이며 변호사 검토 후 시행. 회원가입 시 모든 약관 필수 동의. `/dashboard/billing` 결제 시 환불정책 별도 체크박스 동의.

---

## 18. 보안 정책 (신규)

### 18.1 환경변수 / 시크릿

| 환경변수 | 위치 | 비고 |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | 클라이언트 번들 차단 (`NEXT_PUBLIC_` 절대 금지) |
| `TOSS_SECRET_KEY` | 서버 전용 | 토스 API Authorization Basic |
| `TOSS_WEBHOOK_SECRET` | 서버 전용 | HMAC-SHA256 서명 검증 |
| `KAKAO_CLIENT_SECRET` | 서버 전용 | (Supabase Provider 측 + 백업) |
| `CLI_SHARED_SECRET` | 서버 전용 | `/api/cli/*` Bearer (constant-time 비교) |
| `CLI_ALLOWED_IPS` | 서버 전용 | IP allowlist (CIDR) |
| `NEXT_PUBLIC_ALLOW_TEST_LOGIN` | development만 | production 빌드 시 빌드 실패 |

### 18.2 시크릿 노출 방지
- `.env*` / `.mcp.json` → `.gitignore`
- pre-commit: gitleaks (PR 차단)
- `oauth_refresh_token` / `billing_key` → 별도 테이블 + pgsodium/Vault + RLS deny

### 18.3 OAuth 보안
- `state` 파라미터: 요청당 랜덤 + 콜백 검증 (CSRF)
- `redirect_uri` 정확 매칭
- 가능 시 PKCE
- access/refresh 토큰 클라이언트 노출 금지

### 18.4 Webhook 서명
- 토스 `/api/webhooks/toss`: HMAC-SHA256 + constant-time + 멱등성
- 위조·재전송 시 401 + 로그 alert

### 18.5 슈퍼어드민 테스트 모드 가드
- `NEXT_PUBLIC_ALLOW_TEST_LOGIN=true` 환경에서만 `/api/auth/test-login` 활성화
- production 빌드 가드: `next.config.ts`가 `VERCEL_ENV='production'` 시 빌드 실패
- IP allowlist + 발급 토큰 1시간 만료
- 톡방·로그에 슈퍼어드민 활동 기록 (감사 추적)

### 18.6 RLS 일관성
- 모든 테이블 `enable row level security`
- 모든 정책에 `is_paid(auth.uid())` AND-결합 (profiles 본인 row 제외)
- `channel_credentials` / `billing_keys`는 전부 deny (서버 RPC 전용)
- `SECURITY DEFINER` 함수는 `set search_path = public, pg_temp` 명시

### 18.7 입출력 sanitization
- 사용자 입력 React escape 의존, `dangerouslySetInnerHTML` 금지
- YouTube description 푸터 텍스트만 삽입 (HTML/스크립트 X)
- SQL은 항상 parameterized (Supabase 클라이언트 또는 RPC)
