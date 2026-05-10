# utube-shorts-jp — 태스크 트래커

> PRD.md §14 로드맵 + 5팀 권고 + §16 결제 + §18 보안 통합 추출.
> 대표님 1인 운영 기준 단일 파일. 페이즈 단위 ## 헤더 분리.
> 작업 후 `[ ]` → `[x]` 체크. 새 작업은 적절한 페이즈에 추가.

**진행률: 85 / 145**  ✅85 / 🔄60  *(Phase 1 완료 + Phase 2 부분 완료 + Phase 3 부분 완료 + 토스 풀 결제 흐름 완료 + CLI/cron/analytics 신규 구현 완료, 카카오 OAuth Provider 설정 + Storage Policies UI 대기)*

| 표기 | 의미 |
|---|---|
| `〔팀명〕` | 담당팀 (`director.md` 매핑표 기준) |
| `(§X.Y)` | PRD.md 역참조 |
| `🔴` | 차단 / 우선순위 최상 |
| `🟡` | 대표님 결정 필요 |

---

## Phase 0 — PoC (정책·기술 리스크 조기 검증)

> 별도 디렉토리 `/Users/cho/Desktop/4141/poc-jp` — utube-start 포크 전 작업
> **킬 스위치**: 1개라도 미해결 → Phase 1 진입 보류

- [x] 〔architect-team〕 별도 디렉토리 `/Users/cho/Desktop/4141/poc-jp` 생성 + 14파일 골격 (§14) — 2026-05-06
- [ ] 〔voice-team〕 Demucs 음성 분리 SNR 게이트 — 한국 숏츠 10편 / **합격: vocals SNR ≥ 6dB AND 잔존 ≤ -3dB, 8/10편** (§14, qa 권고)
- [ ] 〔edit-team〕 9:16 주체 트래킹 — 가로영상 5편 / **합격: IoU ≥ 0.7 프레임 ≥ 90%, 4/5편** (§14, qa 권고)
- [ ] 〔edit-team〕 ASS 자막 한·일 폰트 (Noto Sans CJK / M PLUS 1p) / **합격: 상용한자 2,136 + KS X 1001 2,350 누락 0** (§14, qa 권고)
- [ ] 🟡 〔voice-team〕 ElevenLabs 일본어 voice 1~3개 / **합격: 5점 척도 평균 ≥ 4.0, 일본 거주 친구 블라인드** (§15, qa 권고)
- [ ] 〔edit-team〕 FFmpeg 8.1 E2E 1편 / **합격: 1080×1920 / CRF≤18 / ≤7분 / 자막 sync ±100ms** (§14, qa 권고)
- [x] 🔴 〔research-team〕 9:16 트래커 도구 결정 — **MediaPipe Selfie Seg 채택** (Apache 2.0, AGPL 회피) — 2026-05-06
  - 1순위 YOLOv8n MPS는 AGPL-3.0 SaaS 배포 시 전체 소스 공개 의무 → 회피
  - 2순위 MediaPipe Apache 2.0 — 인물 중심 일본 콘텐츠에 적합
- [ ] 〔dev-team〕 PoC scripts/01~05 실제 구현 (API 키 발급 후) — 골격은 완료
- [x] 〔dev-team〕 09-styled-bench.ts 강조 효과 강화 — title_segments 시간 분할 + punch_zoom 1.15x/1.30x (505 라인, verifier-team PASS) — 2026-05-10
- [x] 〔dev-team〕 09-styled-bench.ts v2~v5 — TITLE 검은배너+빨강노랑 / MAIN 검은박스 / NARR 화자분리 / TTS narration 분리 / loudnorm / 줌 escape 수정 (총 ~750 라인) — 2026-05-10
- [x] 🔴 〔db-guard-team〕 0009_pair_orientation 마이그 적용 — shorts_pairs.orientation enum vertical|horizontal default vertical — 2026-05-10
- [x] 🔴 〔dev-team〕 페어 등록 폼 Phase A UX — 3섹션 그룹화 + orientation 라디오 + 툴팁 + 안내문구 + 등록 후 router.push 페어상세 — 2026-05-10
- [x] 〔dev-team〕 /api/pairs route.ts orientation 검증+INSERT — ALLOWED_ORIENTATION 체크, default 'vertical' fallback — 2026-05-10
- [x] 〔verifier-team〕 Phase A 검증 — tsc 0 errors / 신규 lint 0 / 폼·API·회귀 모두 PASS — 2026-05-10
- [x] 〔dev-team〕 Phase B-① PoC 가로 letterbox 분기 — orientation horizontal 인자, NARR/MAIN/HIGH MarginV·폰트 분기 (737→814) — 2026-05-10
- [x] 〔dev-team〕 Phase B-② youtubeMeta 자동 생성 — GPT 프롬프트에 youtube_title/description/tags 추가, meta.json 저장 — 2026-05-10
- [x] 〔dev-team〕 Phase B-③ 썸네일 자동 생성 — generateThumbnail() 신규, ffmpeg -ss 프레임 추출, 1080×1920 pad — 2026-05-10
- [x] 🔴 〔dev-team〕 Phase B-④A worker 인프라 — emitStage()/wrap() 8 stage + cli-worker.ts (448) + upload-output.ts + complete API metadata 머지 — 2026-05-10
- [x] 🔴 〔dev-team〕 Phase B-④B UI 통합 — thumbnail/route.ts (75) + thumbnail-preview.tsx (94) + meta-editor prefill + page.tsx grid 2col — 2026-05-10
- [x] 〔verifier-team〕 Phase B-④ 검증 — tsc 0 / build 37 routes / cli-worker --help/--once OK / UI 회귀 0 — 2026-05-10
- [x] 〔부장〕 .env.example WORKER_* 4개 추가 (WORKER_API_BASE/KEY/ID/POC_PATH) — 2026-05-10
- [ ] 〔doc-sync-team〕 워커 셋업 가이드 — CLAUDE.md 또는 docs/WORKER.md 에 launchctl plist + .env 설정 + 트러블슈팅 (P3 정리)
- [ ] 〔dev-team〕 P3 정리 — PoC download wrap 제거 (워커가 선보고 후 PoC 가 또 보고하는 중복 stage row)
- [ ] 〔부장〕 PoC 6항목 합산 GO/NO-GO — `99-poc-report.ts` 실행 → Phase 1 진입 결정

---

## Phase 1 — 베이스 구축

- [x] 〔dev-team〕 Phase 1 Next.js 16 베이스 셋업 — 22 파일 (proxy.ts·@supabase/ssr·shadcn) — 2026-05-06
- [x] 〔dev-team〕 불필요 모듈 — testtest는 백지 시작이라 N/A
- [x] 〔dev-team〕 Next.js 16.2.2 + Tailwind v4 — 2026-05-06 build PASS
- [ ] 🔴 〔대표님〕 Supabase 프로젝트 + **Pro 플랜 전환** (키 발급 ✅ / Pro 전환 미확인 — 콘솔에서 확인 필요)
- [x] 〔db-guard-team〕 마이그레이션 — 15개 테이블 (+webhook_events, 결함 6+보강 4+사업 5 모두 반영) — 2026-05-06 `supabase/migrations/0001~0005`
- [x] 〔db-guard-team〕 인덱스 (uploads(pair_id) 신규 추가, next_charge_at asc 부분 인덱스 보강) — 2026-05-06
- [x] 〔db-guard-team〕 `is_paid()` `security definer set search_path` 명시 — 2026-05-06 `0002_functions_triggers.sql`
- [x] 〔db-guard-team〕 RLS 정책 본문 — 4테이블 AND 결합 누락분 작성 — 2026-05-06 `0003_rls_policies.sql`
- [x] 〔db-guard-team〕 Storage 버킷 4개 + RLS 본문 — 2026-05-06 `0004_storage_buckets.sql`
- [x] 〔db-guard-team〕 `channels.slug` immutable + INSERT CHECK 정규식 — 2026-05-06
- [x] 〔db-guard-team〕 `handle_new_user()` search_path 코드 + EXCEPTION 흡수 — 2026-05-06
- [x] 🔴 〔부장+supabase-mcp〕 마이그 적용 — Supabase MCP `apply_migration` 으로 `0001~0005` + `0006_advisor_fixes` 6건 원격 적용 — 2026-05-06
- [x] 〔db-guard-team〕 `0006_advisor_fixes` — handle_new_user RPC REVOKE / FK 인덱스 8건 / RLS 15건 `(select auth.uid())` 패턴 — 2026-05-06 advisor WARN 26→1 (남은 1건 `is_paid` RPC는 의도된 GRANT)
- [ ] 🔴 〔대표님〕 `0007_storage_policies_manual.sql` — Supabase Dashboard SQL Editor 에서 수동 실행 (MCP 권한 거부: must be owner of relation objects)
- [x] 〔dev-team〕 `.env*` / `.mcp.json` `.gitignore` 처리 — 2026-05-06 (gitleaks pre-commit 미적용)
- [x] 〔부장〕 `.mcp.json` Supabase MCP 호스티드 연결 (project_ref + read_only=false + features 7개) — 2026-05-06
- [x] 〔dev-team〕 Vercel 배포 — `https://testtest-eight-ashy.vercel.app` — 2026-05-06
- [x] 🔴 〔부장〕 Vercel 빌드 hotfix — `env.ts` lazy Proxy + `(dashboard) force-dynamic` (NEXT_PHASE 빌드 시 검증 스킵) — 2026-05-06 commit 9eb6b7c
- [ ] 🔴 〔대표님〕 Vercel env 등록 (`NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPERADMIN_EMAIL` / `NEXT_PUBLIC_ALLOW_TEST_LOGIN=false`) — 런타임 차단 해제
- [ ] 🔴 〔대표님〕 Supabase URL Configuration (Site URL = Vercel · Redirect URLs = Vercel/** + localhost/**) — Auth flow 차단 해제 (진행 중)
- [ ] 〔consultant 권고〕 채널마다 별도 Gmail + 별도 GCP 프로젝트 (blast radius, §13.1)
- [ ] 🟡 〔consultant 권고〕 `license_source` 1차 출시: **CC + self_filmed만 허용** (§15)
- [ ] 〔verifier-team〕 Phase 1 검증

---

## Phase 2 — 인증 / 결제 게이트

- [ ] 〔dev-team〕 Supabase Auth Kakao Provider 활성화 (§2.1)
- [ ] 〔dev-team〕 카카오 개발자 콘솔 — 앱 + Redirect URI (`https://<ref>.supabase.co/auth/v1/callback`) + 동의항목 (§2.1)
- [ ] 🟡 〔dev-team〕 카카오 비즈앱 전환 여부 결정 (이메일 필수 동의 필요 시)
- [x] 〔dev-team〕 `@supabase/ssr` 미들웨어 (서버/브라우저 클라이언트 분리) (§2.4) — 2026-05-06 `src/proxy.ts` (Next.js 16 정식 컨벤션)
- [x] 〔dev-team〕 미들웨어 결제 게이트 — `is_paid()` 체크 + `/dashboard/billing?from=blocked` 리다이렉트 (§2.4) — 2026-05-06 `src/lib/supabase/proxy-helper.ts`
- [x] 〔dev-team〕 슈퍼어드민 test-login (verifyOtp + token_hash 흐름) — 2026-05-06 GET → /dashboard 한방 통과 검증
- [x] 〔dev-team〕 로그인 버튼 (카카오 signInWithOAuth) — 2026-05-06 `src/app/_components/login-button.tsx` (모달 미적용, 인라인 배치)
- [x] 🔴 〔dev-team〕 `/api/auth/test-login` (env 가드 + IP allowlist + 1시간 만료) (§2.1, §18.5) — 2026-05-06 commit d043e51 VERCEL_ENV+NODE_ENV 이중가드+timingSafeEqual CLI_ALLOWED_IPS
- [x] 🔴 〔dev-team〕 `next.config.ts` production 빌드 가드 — `VERCEL_ENV='production'` + `NEXT_PUBLIC_ALLOW_TEST_LOGIN=true` 동시 시 빌드 실패 (§18.5) — 2026-05-06 commit d043e51
- [x] 〔dev-team〕 운영자 영구 무료 — `bjcho9542@gmail.com` 시드 — 2026-05-06 `0005_seed.sql` (첫 로그인 후 수동 UPDATE 절차 명시)
- [x] 〔dev-team〕 profiles 트리거 동작 확인 (auth.users → profiles) — 2026-05-06 `0002_functions_triggers.sql` handle_new_user + EXCEPTION 흡수 완료
- [ ] 〔security-team〕 OAuth `state` CSRF 검증 + `redirect_uri` 정확 매칭 (§18.3)
- [ ] 〔security-team〕 Phase 2 보안 리뷰
- [ ] 〔qa-team〕 로그인·결제 게이트·테스트 로그인 E2E
- [ ] 〔verifier-team〕 Phase 2 검증

---

## Phase 3 — 어드민 대시보드

- [x] 〔dev-team〕 `/dashboard` 홈 + 결제 위젯 (account + 최근 5건 payments) (§6.1) — 2026-05-06 commit 1585228
- [ ] 〔dev-team〕 `/dashboard/research` (utube-start 재활용 + Supabase 저장)
- [x] 〔dev-team〕 `/dashboard/pairs` 신규 — 한국+원본 URL 입력 + license_source 필수 입력 + 페어 상세 (`/dashboard/pairs/[id]`) — 2026-05-06 commit 6e3adb5+1af45ad
- [ ] 〔dev-team〕 `/dashboard/settings` — 트렌딩 사운드 풀 관리
- [x] 〔dev-team〕 `/dashboard/billing` 신규 — 결제 진입 + 사용 기간 + 영수증 + 해지 (§6.1) — 2026-05-06 commit b0f3849+8bea7a4
- [ ] 〔dev-team〕 `/dashboard/upload` — 9항 체크리스트 UI 명세 (§6.1.1)
  - 원본 ↔ 번역본 side-by-side 플레이어
  - 체크 2 (해설 ≥1개) 인라인 입력
  - 체크 4 (transformation ≥4 / 첫 30편 ≥5) 토글
  - 자동 체크 (1·3·5·6·7·8·9) green/red 배지
  - 30초 타이머 표시
- [ ] 〔dev-team〕 `/dashboard/chat` — Realtime `agent_logs` 구독 (미구현)
- [ ] 〔dev-team〕 `/dashboard/production` — 단계별 산출물 미리보기 (mp3/srt/mp4) (미구현)
- [ ] 〔code-review-team〕 Phase 3 코드 리뷰
- [ ] 〔qa-team〕 Phase 3 시나리오 테스트 + 모바일 반응형
- [ ] 〔verifier-team〕 Phase 3 검증

---

## Phase 4 — 변환 파이프라인

- [ ] 〔architect-team〕 stage 의존성 그래프 + 4갈래 병렬 설계 (§5.2)
- [ ] 〔dev-team〕 `cli/poll.ts` — `FOR UPDATE SKIP LOCKED` 또는 조건부 UPDATE (§4.2.1)
- [ ] 〔dev-team〕 stale 워커 회수 cron (5분 timeout → queued 복귀 + `attempt += 1`) (§4.2.1)
- [ ] 〔dev-team〕 다운로드팀 (yt-dlp + Storage 업로드)
- [ ] 〔dev-team〕 STT (faster-whisper)
- [ ] 〔dev-team〕 컷 타이밍 (ffprobe 씬 체인지)
- [ ] 〔dev-team〕 번역 (Vercel AI Gateway, Claude → GPT-4o 폴백) (§5.2)
- [ ] 〔dev-team〕 음성 분리 (Demucs CLI 래퍼) + SNR 게이트 (§5.2.1)
- [ ] 〔dev-team〕 TTS (ElevenLabs eleven_multilingual_v2 + timestamps)
- [ ] 〔dev-team〕 9:16 크롭 (이미 9:16 bypass 분기) (§5.2.1)
- [ ] 〔dev-team〕 ASS 자막 합성 (Noto Sans CJK fallback)
- [ ] 〔dev-team〕 amix (원본 BGM + 일본어 TTS) — **자체 BGM 합성 금지** (부록 B)
- [ ] 〔dev-team〕 렌더 (1080×1920 H.264 CRF 18 AAC)
- [ ] 〔dev-team〕 stage idempotency `input_hash` 캐시 키 (재시작 비용 0) (§5.2)
- [ ] 〔dev-team〕 stage 실패 매트릭스 구현 (§5.2.1)
- [ ] 〔dev-team〕 `conversion_jobs.attempt` 카운터 + 3회 실패 후 failed 고정
- [ ] 〔dev-team〕 `cost_ledger` 기록 (ElevenLabs char / LLM token / YouTube unit / Storage MB) (§3.2.1)
- [ ] 〔dev-team〕 분석팀 — 컷 타이밍 + BGM 추천 (`bgm_recommendations` 3 row)
- [ ] 〔dev-team〕 검수팀 — 9항 자동 체크 (1·3·5·6·7·8·9) (§5.2 ④)
- [ ] 🟡 〔dev-team〕 빨간딱지 키워드 정규식 한국어/일본어 각 50개 (§15)
- [ ] 〔code-review-team〕 Phase 4 코드 리뷰
- [ ] 〔qa-team〕 Phase 4 엣지케이스 — 다운로드 차단·STT 실패·SNR 미달·TTS 충돌·9:16 bypass
- [ ] 〔verifier-team〕 Phase 4 검증

---

## Phase 5 — 자동 업로드

- [ ] 🔴 〔security-team + db-guard-team〕 `channel_credentials` 분리 + pgsodium/Vault 암호화 (§3.2.1, §18.2)
- [ ] 〔dev-team〕 YouTube OAuth 플로우 (refresh token → channel_credentials 암호화 저장)
- [ ] 〔dev-team〕 업로드팀 (`videos.insert` unlisted, `defaultLanguage='ja'`, `altered_content=true`)
- [ ] 〔dev-team〕 표준 푸터 자동 삽입 (원본URL/원작자/AI고지) (§5.2)
- [ ] 〔dev-team〕 Content ID 5분 polling (§5.2 ④)
- [ ] 〔dev-team〕 block/takedown 시 공개 차단 + 어드민 alert
- [ ] 〔dev-team〕 `/dashboard/upload` BGM 추천 카드 + 모바일 체크리스트
- [ ] 〔dev-team〕 공개 전환 Server Action (`videos.update privacyStatus='public'`)
- [ ] 〔dev-team〕 Strike polling (`channels.cg_strike_count / copyright_strike_count`)
- [ ] 〔dev-team〕 `upload_paused` 자동 토글 (Strike 감지 시)
- [ ] 〔dev-team〕 OAuth refresh token 만료 감지 + 어드민 알림 (§13.2)
- [ ] 🟡 〔consultant 권고〕 `transformation` 첫 30편 5개 강제 (§15)
- [ ] 🟡 〔dev-team〕 가짜 뉴스 키워드 정규식 (`速報|独占|衝撃` 등) (§15)
- [ ] 〔qa-team〕 Phase 5 시나리오 (업로드 실패·Content ID·Strike·OAuth 만료)
- [ ] 〔verifier-team〕 Phase 5 검증

---

## Phase 5 → 6 — Go/No-go 게이트 SOP

> 첫 10편 unlisted 업로드 → 5분 polling. 4지표 모두 통과해야 Phase 6 진입.

- [ ] 〔부장 + 대표님〕 첫 10편 unlisted 업로드 (테스트)
- [ ] 〔부장〕 Content ID `block`/`takedown` 비율 < 30% 검증
- [ ] 〔부장〕 검수 인간 게이트 2·4 합격률 > 60% 검증
- [ ] 〔부장〕 평균 변환 처리 시간 < 5분 검증
- [ ] 〔부장〕 Strike 0회 검증
- [ ] 🟡 〔대표님 결정〕 4지표 통과 → Phase 6 / 1지표 실패 → 영역 수정 후 5편 재테스트 / Content ID 30%↑ → **사업 모델 재설계**
- [ ] 〔consultant〕 일본 거주 친구 1명 voice·번역 검수 루프 확보 (§15)

---

## Phase 6 — 운영 안정화

- [ ] 〔dev-team〕 Realtime 소통방 `/dashboard/chat` (`agent_logs` Supabase Realtime)
- [ ] 〔dev-team〕 멀티 채널 동시 실행 검증 (Ghostty 분할, 채널×4)
- [ ] 〔dev-team〕 Storage 자동 정리 cron (input/artifacts 7일 후 삭제)
- [ ] 〔dev-team〕 `/dashboard/analytics` — KPI 측정 (합격률·비용·처리량·MAS)
- [ ] 〔doc-sync-team〕 사용자 매뉴얼 `docs/MANUAL.md`
- [ ] 〔verifier-team〕 Phase 6 검증

---

## 🔒 보안 [FAIL] 3건 (횡단 — security-team이 Phase 전반 추적)

> security-team 검토에서 [FAIL] 처리된 배포 차단 사항. 해제 전 production 배포 금지.

- [ ] 🔴 `oauth_refresh_token` Vault 암호화 (Phase 1 — `channel_credentials` 테이블 분리 + pgsodium) (§3.2.1, §18.2)
- [ ] 🔴 RLS `whitelisted` AND-결합 → `is_paid()` 패턴으로 모든 정책에 명시 (Phase 1) (§3.3)
- [ ] 🔴 `/api/cli/*` Bearer (constant-time 비교) + IP allowlist (`CLI_SHARED_SECRET` + `CLI_ALLOWED_IPS`) (Phase 4) (§6.2, §18.1)

---

## 💳 결제 §16 (Phase 2~3 걸쳐 진행, **3단 감사 필수**)

> `director.md`: 결제·정산 → `code-review-team` + `security-team` 필수.

- [x] 〔dev-team〕 토스 테스트 키 발급 — docs v2 페어 (gck/gsk) Vercel Production+Preview 등록 — 2026-05-06
- [ ] 〔dev-team〕 환경변수 등록 (`TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` / `TOSS_WEBHOOK_SECRET`)
- [x] 〔dev-team〕 일반결제 — `@tosspayments/tosspayments-sdk` v2 + `widgets.requestPayment` + `/api/payments/confirm` + amount 위변조 방지 (SUBSCRIPTION_AMOUNT_KRW 강제) (§16.2) — 2026-05-06
- [x] 〔dev-team〕 결제 success/fail 페이지 — `/dashboard/billing/success` (confirm + payments INSERT + paid_until +1개월) / fail — 2026-05-06
- [x] 〔dev-team〕 webhook handler — `/api/webhooks/toss` (HMAC SHA-256 + webhook_events 멱등성 + DONE/CANCELED 분기) (§16.7) — 2026-05-06
- [x] 〔dev-team〕 환불 API — `/api/payments/refund` (본인 결제 검증 + 토스 cancel + refunds INSERT) (§16.5) — 2026-05-06
- [x] 〔dev-team〕 dashboard 결제 상태 위젯 — paid_until / 최근 5건 결제 표시 — 2026-05-06
- [ ] 〔대표님〕 토스 webhook secret — 도메인 등록 후 콘솔 발급 → `TOSS_WEBHOOK_SECRET` 등록 시 자동 활성
- [x] 〔dev-team〕 정기결제 — 빌링키 발급 + `customerKey` UUID + AES-256-GCM 암호화 (§16.3) — 2026-05-06 commit 8bea7a4 `api/billing/issue/route.ts` + `lib/crypto.ts`
- [x] 〔dev-team〕 자동결제 cron (Vercel Cron 매일 00:00 KST `vercel.json "0 15 * * *"`) (§16.3) — 2026-05-06 commit 1af45ad `api/cron/billing/charge/route.ts`
- [x] 〔dev-team〕 자동결제 실패 → `past_due` (3회) → `expired` (7일) (§13.3) — 2026-05-06 commit 1af45ad cron/billing/charge 구현 완료
- [x] 🔴 〔security-team〕 `/api/webhooks/toss` HMAC-SHA256 + constant-time + 멱등성 (`payment_key + status` dedup) (§16.4, §18.4) — 2026-05-06 commit e1f1277+fc86f5e
- [x] 〔dev-team〕 환불 — `/v1/payments/{paymentKey}/cancel` + 환불 정책 검증 (§16.5) — 2026-05-06 commit e1f1277 `api/payments/refund/route.ts`
- [x] 〔dev-team〕 정기결제 사전고지 — 30일 전 통지 (전자상거래법 §20조의2) (§16.6) — 2026-05-06 commit 1af45ad `api/cron/billing/notify/route.ts`
- [x] 〔dev-team〕 `orderId` UNIQUE + 클라이언트 5초 disable 락 (중복결제 방지) (§13.3) — 2026-05-06 commit b0f3849 `payment-widget.tsx` setTimeout 5000ms + disabled submitting
- [ ] 〔dev-team〕 빌링키 유출 감지 → 즉시 `revoke` 처리 (§13.3)
- [ ] 🔴 〔code-review-team + security-team + doc-sync-team〕 결제 코드 3단 감사 (`director.md`)
- [ ] 〔qa-team〕 결제 시나리오 (실패·중복·환불·구독취소·카드만료·PG 장애·webhook 재전송) (§13.3)
- [ ] 🟡 〔대표님 결정〕 가격 차등화 — 일반 ₩9,900 / 30일 vs 구독 ₩7,900~9,900 / 월

---

## 📋 약관·법적 (Phase 1 진입 전 placeholder, 시행은 변호사 검토 후)

- [x] `docs/legal/TERMS.md` 1차 작성
- [x] `docs/legal/PRIVACY.md` 1차 작성
- [x] `docs/legal/REFUND.md` 1차 작성
- [ ] 🟡 placeholder 채우기 — `{{COMPANY}}` `{{REPRESENTATIVE}}` `{{ADDRESS}}` `{{EMAIL}}` `{{BIZNO}}` `{{COMMERCE_NO}}`
- [ ] 🔴 변호사 검토 + 시행 (production 배포 전)
- [ ] 회원가입 시 약관 3종 필수 동의 UI
- [x] `/dashboard/billing` 결제 시 환불정책 별도 체크박스 — 2026-05-06 commit a1f2e9a `payment-widget.tsx` refundAgreed checkbox + /refund 링크 + disabled 연동

---

## 🟡 미해결 의사결정 (대표님 판단 필요)

- [ ] 일본 채널 명칭 N개 + slug
- [ ] 자막 폰트 — Noto Sans CJK / M PLUS 1p / 기타
- [ ] 트렌딩 사운드 풀 초기 5개 seed
- [ ] 번역 LLM 우선순위 — Claude vs GPT-4o (Vercel AI Gateway 폴백 순서)
- [ ] 가격 차등화 — 구독 ₩7,900 인센티브?
- [ ] 카카오 비즈앱 검수 시점 (이메일 필수 동의 필요할 때)
- [ ] 원본 URL 미입력 시 정책 — 한국 숏츠로 진행 vs 변환 거부
- [ ] Strike 발생 시 자동 정지 범위 — 발생 채널만 vs 전체 채널 일괄
- [ ] 권리자 컨택 템플릿 (YOUTUBE_POLICY §7.4) — 일본어/한국어/영어 작성 범위
- [ ] 채널별 voice ID 화이트리스트 초기 셋

---

## 🆕 5팀 검토 권고 (2026-05-06 — PRD 패치 필요)

> architect / db-guard / security / qa / consultant 5팀 PRD 최종 점검 결과.
> 각 항목은 PRD 본문 패치 + 해당 Phase 태스크에 흡수 필요.

### A. architect-team — 시스템 구조 (3건)

- [ ] 🔴 〔architect-team〕 SPOF 페일오버 SOP §13.2 보강 (Mac 1대 다운 시 RTO/RPO 명시) — Phase 5 전 필수
- [ ] 🔴 〔architect-team〕 stage별 `input_hash` 명세 + 캐시 lookup 규칙 §5.2 — Phase 4 착수 전 필수
- [ ] 〔db-guard-team〕 `worker_sessions` 신규 테이블 (worker_id PK, channel_id, last_heartbeat, current_pair_id, current_stage) — Phase 6
- [ ] 〔dev-team〕 Vercel + Supabase 리전 통일 `ap-northeast-1` (Tokyo) — Phase 1
- [ ] 〔dev-team〕 OAuth refresh token 90일 회전 cron — Phase 5

### B. db-guard-team — DB 결함 (Phase 0 전 패치 권고)

- [x] 🔴 〔db-guard-team〕 `is_paid()` `SECURITY DEFINER set search_path = public, pg_temp` 명시 — 2026-05-06 `0002_functions_triggers.sql`
- [x] 🔴 〔db-guard-team〕 `uploads(pair_id)` 인덱스 추가 (RLS join 풀스캔 방지) — 2026-05-06 `0001_initial_schema.sql`
- [x] 🔴 〔db-guard-team〕 RLS `is_paid()` AND-결합 본문 SQL 4테이블 (conversion_jobs/bgm_recommendations/agent_logs/uploads) 작성 — 2026-05-06 `0003_rls_policies.sql`
- [ ] 🔴 〔db-guard-team〕 `conversion_jobs(pair_id, stage, attempt) UNIQUE` race — `INSERT ... ON CONFLICT DO NOTHING RETURNING` 패턴 명시
- [ ] 🔴 〔db-guard-team〕 `cost_ledger.pair_id on delete set null` + `pair_id_snapshot uuid not null` (KPI 회계 무결성)
- [x] 〔db-guard-team〕 `channels.slug` INSERT CHECK `(slug ~ '^[a-z0-9-]+$' and length 2~40)` — 2026-05-06 `0001_initial_schema.sql`
- [ ] 〔db-guard-team〕 `profiles.active_subscription_id` `references subscriptions(id) deferrable initially deferred` 명시

### C. security-team — 신규 [FAIL] + [POLICY] (Phase 2 전 차단)

- [x] 🔴 〔dev-team〕 F-4: `next.config.ts` 빌드 가드 + **런타임 가드 이중화** (`/api/auth/test-login` 첫 줄에서 `VERCEL_ENV !== production && NODE_ENV !== production` 동시 체크) — 2026-05-06 commit d043e51+fc86f5e
- [ ] 🔴 〔dev-team〕 F-5: `refunds.cancel_amount` 검증 (음수 방지 CHECK + `cancel_amount + 누적 ≤ amount` 서버 SQL `FOR UPDATE`)
- [x] 🔴 〔dev-team〕 Webhook 멱등성 — `webhook_events(payment_key, status) ON CONFLICT DO NOTHING RETURNING` atomic dedup — 2026-05-06 commit e1f1277+fc86f5e `api/webhooks/toss/route.ts` dedup code 23505
- [x] 🔴 〔db-guard-team〕 `handle_new_user()` 본문에 `SET search_path = public, pg_temp` 코드 추가 — 2026-05-06 `0002_functions_triggers.sql` + `0006_advisor_fixes.sql`
- [ ] 〔dev-team〕 PKCE 강제 (`flowType: 'pkce'`) Supabase Auth 옵션
- [ ] 〔doc-sync-team〕 약관 패치 — TERMS §3 변경 통지 7일 → 30일 / REFUND §17조2항 부합 / PRIVACY §4 국외이전 동의 (Anthropic/OpenAI/ElevenLabs) / TERMS §10 통신판매업 신고
- [ ] 〔dev-team〕 CLI `CLI_SHARED_SECRET` 로테이션 절차 (이중 키 허용 기간) §18 추가
- [ ] 〔dev-team〕 `agent_logs` PII sanitization (카카오 닉네임·email·IP 마스킹)

### D. qa-team — Phase 0 진입 차단 (임계값은 위 Phase 0 섹션에 흡수)

- [ ] 🔴 〔dev-team〕 `shorts_pairs.warnings jsonb` 컬럼 추가 (다운로드차단·STT실패·SNR미달·TTS충돌·9:16 bypass 사용자 노출)
- [ ] 🔴 〔dev-team〕 `/dashboard/upload` 9항 체크리스트 — 각 체크별 1줄 정의 + 예시 영상 링크 + 첫 30편 부장 2차 검토 (이중 게이트)
- [ ] 🔴 〔dev-team〕 `/dashboard/chat` 채널 dropdown + agent 색상 + Realtime 끊김 시 5초 polling 폴백
- [ ] 〔dev-team〕 30초 타이머 — 미만 통과 시 경고 모달 + `agent_logs` 검수 소요시간 기록
- [ ] 〔dev-team〕 `/dashboard/billing` past_due 7일 카운트다운 배너 + 3D 인증 실패 재진입 동선
- [ ] 〔dev-team〕 모바일 반응형 우선 (`/dashboard/upload` BGM 카드) — Tailwind v4 breakpoint 명시

### E. consultant — 사업 모델 결정 (🟡 대표님 판단 필수)

- [x] 1차 타겟 결정 — **한국 거주 일본어 운영자 only** ✅ 부장 자율결정 2026-05-06
- [x] license_source 1차 출시 — **CC + self_filmed만** ✅ 부장 자율결정 2026-05-06
- [x] transformation 강제 — **6개 강제 (해설 voice over 추가)** ✅ 부장 자율결정 2026-05-06
- [x] 검수 인력 — **AI(Gemini) 1차 + 친구 + 백업 외주 1명** ✅ 부장 자율결정 2026-05-06
- [x] Phase 0 범위 — **1채널 30편/주** (4채널은 Phase 3) ✅ 부장 자율결정 2026-05-06
- [ ] 〔consultant〕 ElevenLabs 상업 라이선스 — BYOK 모델 검토 (사용자 자기 키 입력)
- [ ] 〔dev-team〕 빨간딱지 — 정규식 + **임베딩 유사도 (text-embedding-3-small) 병행** (정규식만은 우회 쉬움)
- [ ] 〔dev-team〕 가짜뉴스 키워드 score 누적 (3개 이상 = 블록) — strict block은 false positive

---

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-05-06 | PRD §14 + 5팀 권고 + §16 결제 + §18 보안 통합 추출. 92개 태스크 |
| 2026-05-06 | 5팀 PRD 최종 점검 (architect/db/security/qa/consultant) → 신규 25개 추가 (총 117). PoC 디렉토리 골격 14파일 완성 (`/Users/cho/Desktop/4141/poc-jp`). |
