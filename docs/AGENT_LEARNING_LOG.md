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

## 2026-05-06 (Phase 1 베이스 + 5팀 검토 + 사업 결정)

- **Next.js 16 미들웨어 = `proxy.ts`** (구 `middleware.ts`). dev-team이 신규 컨벤션 채택. 헬퍼 파일도 `proxy-helper.ts` 로 명명 통일.
- **AGPL 라이선스 함정**: YOLOv8n 빠르고 정확하지만 AGPL-3.0 → SaaS 배포 시 전체 소스 공개 의무. SaaS 프로젝트는 **MediaPipe (Apache 2.0)** 같은 안전 라이선스 우선 채택.
- **`@supabase/ssr` 타입 stub 한계**: `Database` 제네릭 stub 단계에서는 `supabase.rpc('is_paid', ..., as never)` 캐스트 임시 사용. **`npx supabase gen types typescript --linked > src/types/database.ts` 적용 후 캐스트 제거** 필수 (TODO 주석으로 남겨야 함).
- **사업 결정 자율 위임 패턴**: 대표님 "니가 알아서 판단" → 부장이 consultant 추천 5건 그대로 [x] 마킹 + TASKS에 "부장 자율결정 YYYY-MM-DD" 노트. PRD 본문 흡수는 후속 일괄 처리.
- **검증팀 호출 시점**: dev-team 큰 작업 (22 파일) 직후 verifier-team 호출이 5단계 검증 체크리스트 정석. Level 1 (빌드·타입·린터) + Level 4 (보안 게이트) 동시. 통과 시 다음 Phase 진입 OK.
- **next.js 마이너 audit 패치**: `npm audit` high+moderate 1건씩이라도 즉시 `npm i next@<patched>` 1줄 핫픽스 (semver-minor, breaking 없음). Phase 2 진입 전 처리.
- **부장 자율 진행 모드의 한계**: 외부 의존 작업 (대표님 키 발급 / 콘솔 셋업 / 마이그 push) 은 부장이 못 함. 대기 큐로 명확히 보고.
- **`npm audit fix --force` 금지 (Next.js)**: `npm audit` 가 next 의 transitive `postcss <8.5.10` (GHSA-qx2v-qp2m-jg93) 를 잡지만, `--force` 는 `next@9.3.3` 으로 다운그레이드 시도 → 절대 금지. Next.js 빌드 시점 CSS 처리만 사용 → 실제 공격면 없음. **다음 next minor patch 대기** 가 정답.

---
