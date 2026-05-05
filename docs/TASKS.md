# utube-shorts-jp — 태스크 트래커

> PRD.md §14 로드맵 + 5팀 권고 + §16 결제 + §18 보안 통합 추출.
> 대표님 1인 운영 기준 단일 파일. 페이즈 단위 ## 헤더 분리.
> 작업 후 `[ ]` → `[x]` 체크. 새 작업은 적절한 페이즈에 추가.

**진행률: 3 / 92**  ✅3 / 🔄89

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

- [ ] 〔dev-team〕 별도 디렉토리 `/Users/cho/Desktop/4141/poc-jp` 생성 (§14)
- [ ] 〔voice-team〕 Demucs 음성 분리 SNR 게이트 임계값 측정 — 한국 숏츠 10편 (§14)
- [ ] 〔edit-team〕 9:16 주체 트래킹 — 가로영상 5편 변환 → 정확도 측정 (§14)
- [ ] 〔edit-team〕 ASS 자막 한·일 폰트 (Noto Sans CJK / M PLUS 1p) 글리프 호환 (§14)
- [ ] 🟡 〔voice-team〕 ElevenLabs 일본어 voice 후보 1~3개 비교 시청·선정 (§15)
- [ ] 〔edit-team〕 FFmpeg 8.1 subtitles + 9:16 + amix 1편 end-to-end (§14)
- [ ] 〔부장〕 PoC 결과 검토 → Phase 1 진입 결정 (킬 스위치)

---

## Phase 1 — 베이스 구축

- [ ] 〔architect-team〕 utube-start → utube-shorts-jp 포크 (§14 P1)
- [ ] 〔dev-team〕 불필요 모듈 제거 (이미지팀·썸네일·CHARACTER_SHEET·대본팀)
- [ ] 〔dev-team〕 Next.js 16 업그레이드 + Tailwind v4 확인
- [ ] 🔴 〔dev-team〕 Supabase 프로젝트 생성 + **Pro 플랜 전환** (§13.2 — Free 1GB 첫주 폭발)
- [ ] 〔db-guard-team〕 마이그레이션 — 14개 테이블 (profiles/channels/shorts_pairs/conversion_jobs/bgm_recommendations/trending_sounds/agent_logs/uploads/channel_credentials/payments/billing_keys/subscriptions/refunds/cost_ledger) (§3.2 + §3.2.1)
- [ ] 〔db-guard-team〕 인덱스 생성 — `shorts_pairs(channel_id,status)`, `(status,created_at)`, `conversion_jobs(pair_id,stage,attempt) UNIQUE`, `uploads(content_id_status) WHERE pending`, `profiles(paid_until)`, `payments(user_id,created_at)`, `subscriptions(next_charge_at) WHERE active`, `cost_ledger(pair_id)` (§3.2)
- [ ] 〔db-guard-team〕 `is_paid()` 헬퍼 함수 + 모든 RLS 정책에 AND 결합 (§3.2)
- [ ] 〔db-guard-team〕 RLS 정책 본문 적용 — channels/shorts_pairs/conversion_jobs/agent_logs/uploads + 결제 5테이블 (§3.3)
- [ ] 〔db-guard-team〕 Storage 버킷 4개 + RLS 본문 (§3.5.1)
- [ ] 〔db-guard-team〕 `channels.slug` immutable 트리거 (§3.5.1)
- [ ] 〔db-guard-team〕 `handle_new_user()` `search_path = public, pg_temp` + `EXCEPTION WHEN unique_violation` (§3.4)
- [ ] 〔dev-team〕 `.env*` / `.mcp.json` `.gitignore` + pre-commit gitleaks (§18.2)
- [ ] 〔consultant 권고〕 채널마다 별도 Gmail + 별도 GCP 프로젝트 (blast radius, §13.1)
- [ ] 🟡 〔consultant 권고〕 `license_source` 1차 출시: **CC + self_filmed만 허용** (§15)
- [ ] 〔verifier-team〕 Phase 1 검증

---

## Phase 2 — 인증 / 결제 게이트

- [ ] 〔dev-team〕 Supabase Auth Kakao Provider 활성화 (§2.1)
- [ ] 〔dev-team〕 카카오 개발자 콘솔 — 앱 + Redirect URI (`https://<ref>.supabase.co/auth/v1/callback`) + 동의항목 (§2.1)
- [ ] 🟡 〔dev-team〕 카카오 비즈앱 전환 여부 결정 (이메일 필수 동의 필요 시)
- [ ] 〔dev-team〕 `@supabase/ssr` 미들웨어 (서버/브라우저 클라이언트 분리) (§2.4)
- [ ] 〔dev-team〕 미들웨어 결제 게이트 — `is_paid()` 체크 + `/dashboard/billing?from=blocked` 리다이렉트 (§2.4)
- [ ] 〔dev-team〕 로그인 모달 (카카오 + DEV 슈퍼어드민 버튼) (§2.2)
- [ ] 🔴 〔dev-team〕 `/api/auth/test-login` (env 가드 + IP allowlist + 1시간 만료) (§2.1, §18.5)
- [ ] 🔴 〔dev-team〕 `next.config.ts` production 빌드 가드 — `VERCEL_ENV='production'` + `NEXT_PUBLIC_ALLOW_TEST_LOGIN=true` 동시 시 빌드 실패 (§18.5)
- [ ] 〔dev-team〕 운영자 영구 무료 — `bjcho9542@gmail.com` 시드
- [ ] 〔dev-team〕 profiles 트리거 동작 확인 (auth.users → profiles)
- [ ] 〔security-team〕 OAuth `state` CSRF 검증 + `redirect_uri` 정확 매칭 (§18.3)
- [ ] 〔security-team〕 Phase 2 보안 리뷰
- [ ] 〔qa-team〕 로그인·결제 게이트·테스트 로그인 E2E
- [ ] 〔verifier-team〕 Phase 2 검증

---

## Phase 3 — 어드민 대시보드

- [ ] 〔dev-team〕 `/dashboard` 홈 + 채널 통계 (§6.1)
- [ ] 〔dev-team〕 `/dashboard/research` (utube-start 재활용 + Supabase 저장)
- [ ] 〔dev-team〕 `/dashboard/pairs` 신규 — 한국+원본 URL 입력 + license_source 필수 입력
- [ ] 〔dev-team〕 `/dashboard/settings` — 트렌딩 사운드 풀 관리
- [ ] 〔dev-team〕 `/dashboard/billing` 신규 — 결제 진입 + 사용 기간 + 영수증 + 해지 (§6.1)
- [ ] 〔dev-team〕 `/dashboard/upload` — 9항 체크리스트 UI 명세 (§6.1.1)
  - 원본 ↔ 번역본 side-by-side 플레이어
  - 체크 2 (해설 ≥1개) 인라인 입력
  - 체크 4 (transformation ≥4 / 첫 30편 ≥5) 토글
  - 자동 체크 (1·3·5·6·7·8·9) green/red 배지
  - 30초 타이머 표시
- [ ] 〔dev-team〕 `/dashboard/chat` — Realtime `agent_logs` 구독
- [ ] 〔dev-team〕 `/dashboard/production` — 단계별 산출물 미리보기 (mp3/srt/mp4)
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

- [ ] 〔dev-team〕 토스 테스트 키 발급 — developers.tosspayments.com (§16.7)
- [ ] 〔dev-team〕 환경변수 등록 (`TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` / `TOSS_WEBHOOK_SECRET`)
- [ ] 〔dev-team〕 일반결제 — TossPayments SDK + `requestPayment` + `/api/payments/confirm` + DB amount 위조 검증 (§16.2)
- [ ] 〔dev-team〕 정기결제 — 빌링키 발급 + `customerKey` UUID + pgsodium 암호화 (§16.3)
- [ ] 〔dev-team〕 자동결제 cron (Vercel Cron 또는 Supabase Edge Function — 매일 00:00 KST) (§16.3)
- [ ] 〔dev-team〕 자동결제 실패 → `past_due` (3회) → `expired` (7일) (§13.3)
- [ ] 🔴 〔security-team〕 `/api/webhooks/toss` HMAC-SHA256 + constant-time + 멱등성 (`payment_key + status` dedup) (§16.4, §18.4)
- [ ] 〔dev-team〕 환불 — `/v1/payments/{paymentKey}/cancel` + 환불 정책 검증 (§16.5)
- [ ] 〔dev-team〕 정기결제 사전고지 — 30일 전 통지 (전자상거래법 §20조의2) (§16.6)
- [ ] 〔dev-team〕 `orderId` UNIQUE + 클라이언트 5초 disable 락 (중복결제 방지) (§13.3)
- [ ] 〔dev-team〕 빌링키 유출 감지 → 즉시 `revoke` 처리 (§13.3)
- [ ] 🔴 〔code-review-team + security-team + doc-sync-team〕 결제 코드 3단 감사 (`director.md`)
- [ ] 〔qa-team〕 결제 시나리오 (실패·중복·환불·구독취소·카드만료·PG 장애·webhook 재전송) (§13.3)
- [ ] 🟡 〔대표님 결정〕 가격 차등화 — 일반 ₩9,900 / 30일 vs 구독 ₩7,900~9,900 / 월

---

## 📋 약관·법적 (Phase 1 진입 전 placeholder, 시행은 변호사 검토 후)

- [x] `docs/TERMS.md` 1차 작성
- [x] `docs/PRIVACY.md` 1차 작성
- [x] `docs/REFUND.md` 1차 작성
- [ ] 🟡 placeholder 채우기 — `{{COMPANY}}` `{{REPRESENTATIVE}}` `{{ADDRESS}}` `{{EMAIL}}` `{{BIZNO}}` `{{COMMERCE_NO}}`
- [ ] 🔴 변호사 검토 + 시행 (production 배포 전)
- [ ] 회원가입 시 약관 3종 필수 동의 UI
- [ ] `/dashboard/billing` 결제 시 환불정책 별도 체크박스

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

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-05-06 | PRD §14 + 5팀 권고 + §16 결제 + §18 보안 통합 추출. 92개 태스크 |
