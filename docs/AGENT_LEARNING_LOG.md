# 에이전트 학습 로그

> 부장(Main Claude)과 휘하 16팀이 작업 중 얻은 교훈을 누적 기록.
> 세션 시작 시 필독. 동일한 실수·재발견 방지가 목적.

---

## 2026-05-06 (PRD SaaS 전환 + 5팀 검토 통합)

- **세션 도중 추가된 `.claude/agents/*.md` 는 자동 로드되지 않음.**
  - **세션 재시작 (Ctrl+C → claude)** 필수. `/clear`·`/agents reload` 명령은 없음.
  - `/agents` 인터페이스로 직접 생성한 경우만 즉시 반영.
  - 근거: code.claude.com/docs/en/subagents.md L238

- **한국 SaaS PRD에 결제 추가 시 동시 챙길 항목 (체크리스트)**:
  1. 보안 [FAIL] 3건 — `oauth_refresh_token` Vault 암호화 / RLS `whitelisted` AND-결합 / `/api/cli/*` Bearer + IP allowlist
  2. 약관·개인정보·환불 3종 — `docs/legal/TERMS.md` / `PRIVACY.md` / `REFUND.md` (전자상거래법 §17·§20조의2)
  3. 슈퍼어드민 테스트 모드 가드 — env (`NEXT_PUBLIC_ALLOW_TEST_LOGIN`) + production 빌드 실패 가드
  4. 토스 Webhook HMAC-SHA256 + 멱등성, 빌링키 pgsodium 암호화, `customerKey` UUID 예측 불가
  5. DB: `payments` / `billing_keys` / `subscriptions` / `refunds` / `cost_ledger` 5테이블 + `profiles.paid_until` / `subscription_status` / `kakao_id` 컬럼

- **외부 자료 조사 시**: research-team에 공식 가이드 출처(URL) 명시 요구. 추측 X.

- **doc-sync-team usage limit hit 시**: 부장 직접 작성으로 즉시 전환 (3:20am 리셋 대기 X).

- **PRD 검토 5팀 병렬 호출 시 핵심 패턴**:
  - architect / security / db-guard / qa / consultant 5팀 동시
  - 각 팀에 800~1500자 응답 길이 제약 → 토큰 폭발 방지
  - 각 팀에 검토 포커스 §X.Y 명시 → 범위 중복 방지
  - 보고는 [PASS] / [NOTE] / [FAIL] / [POLICY] 첫 줄 태그 강제

- **사내 팀 호출 안 되는 경우 폴백**:
  1. `general-purpose` + 페르소나 .md 프롬프트 주입
  2. `/agents` 인터페이스로 등록 후 재시도
  3. 부장 직접 처리

---
