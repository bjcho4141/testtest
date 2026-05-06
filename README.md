# utube-shorts-jp

> 한국 숏츠 → 일본어 자동 현지화 SaaS (1인 운영)
> 베이스: `/Users/cho/Desktop/4141/utube-start` (Phase 1 진입 시 포크)

## 시스템 구성 (3-플레인)

```
[컨트롤]  Next.js 16 어드민 (Vercel 배포)
   ↕
[데이터]  Supabase (Postgres + Auth + Storage + Realtime)
   ↕
[실행]   로컬 Mac CLI (Demucs / FFmpeg / yt-dlp)
```

## 주요 문서

| 문서 | 용도 |
|---|---|
| [`docs/PRD.md`](./docs/PRD.md) | 제품 요구사항 (SaaS v2, 1300줄) |
| [`docs/YOUTUBE_POLICY.md`](./docs/YOUTUBE_POLICY.md) | YouTube Shorts 정책 가이드 (G1~G5) |
| [`docs/TASKS.md`](./docs/TASKS.md) | 92개 태스크 트래커 (페이즈별) |
| [`docs/TERMS.md`](./docs/TERMS.md) · [`PRIVACY.md`](./docs/PRIVACY.md) · [`REFUND.md`](./docs/REFUND.md) | 한국 SaaS 약관 1차 (변호사 검토 필요) |
| [`docs/AGENT_LEARNING_LOG.md`](./docs/AGENT_LEARNING_LOG.md) | 에이전트 학습 로그 |
| [`CLAUDE.md`](./CLAUDE.md) | Claude Code 하네스 룰 (부장 + 16팀) |

## 페이즈 로드맵

```
Phase 0 — PoC          Demucs SNR / 9:16 / ASS / voice 검증
Phase 1 — 베이스       utube-start 포크 + Supabase + 마이그
Phase 2 — 인증         카카오 OAuth + 결제 게이트 + 슈퍼어드민 테스트
Phase 3 — 어드민       8 페이지 (research / pairs / billing / upload …)
Phase 4 — 파이프라인    변환 5단계 (병렬 4갈래)
Phase 5 — 자동 업로드   YouTube unlisted + Content ID polling
Phase 5→6 게이트       첫 10편 unlisted 테스트 (Go/No-go)
Phase 6 — 안정화       Realtime 소통방 + Storage cron + Analytics
```

자세한 내용은 [`docs/PRD.md` §14](./docs/PRD.md) / [`docs/TASKS.md`](./docs/TASKS.md).

## 시작

```bash
# 1. 환경변수
cp .env.example .env.local
# .env.local 열고 키 채우기 (토스 테스트 키는 developers.tosspayments.com 에서 즉시 발급)

# 2. 의존성 (Phase 1 진입 후)
npm install

# 3. 개발 서버
npm run dev
```

## 결제 모델

| 플랜 | 가격 | 비고 |
|---|---|---|
| 일반 | ₩9,900 / 30일 1회 | 토스페이먼츠 일반결제 |
| 구독 | ₩9,900 / 월 자동 | 토스페이먼츠 빌링키 + 서버 cron |
| 운영자 | 영구 무료 | `bjcho9542@gmail.com` (env로 관리) |
| 슈퍼어드민 테스트 | 영구 무료 | `NEXT_PUBLIC_ALLOW_TEST_LOGIN=true` (DEV 전용) |

## 운영 / 협업

- **1인 운영** 기준 (협업 시 SaaS 화이트리스트 + 페이즈별 분담)
- **부장(Main Claude) + 16팀 에이전트 하네스** — `.claude/agents/*.md`
- **톡방 viewer**: 채팅창에 `톡방 열어줘` 또는 `npx harness-bujang chat`
- **톡방 DB**: `.harness/chat.db` (gitignore, 로컬 전용)

## 보안 [FAIL] 3건 (배포 차단 — Phase 1 작업)

production 배포 전 반드시 해제:
1. `oauth_refresh_token` Vault/pgsodium 암호화 (`channel_credentials` 테이블 분리)
2. RLS `is_paid()` AND-결합 모든 정책 명시
3. `/api/cli/*` Bearer + IP allowlist

자세한 내용 [`docs/PRD.md` §18](./docs/PRD.md) · [`docs/TASKS.md`](./docs/TASKS.md) 🔒 섹션.

## 라이선스

Private. 무단 사용 금지.
