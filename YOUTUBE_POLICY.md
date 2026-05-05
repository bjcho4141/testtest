# YOUTUBE_POLICY.md — utube-shorts-jp 정책 가이드

> 최종 업데이트: 2026-05-04
> 버전: 1.0
> 목적: 본 프로젝트(한국 숏츠 + 해외 원본 → 일본어 현지화 자동 업로드)가 YouTube에서 ① **계정 종료(strike)**, ② **수익화 박탈(demonetization)**, ③ **동일 콘텐츠/Reused Content 분류**를 회피하기 위한 운영 규칙. 검수팀 게이트와 자동 업로드 모듈이 본 문서를 기준으로 의사결정한다.
> 1차 자료(공식 YouTube Help)는 §8에 정리. 정책 변경 시 본 문서 §0 변경 이력을 갱신한다.

---

## 0. 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-04 | 초기 작성. 5대 리스크(Reused Content / 저작권 / AI 미공개 / 광고 친화 / 메타데이터 오인) + 파이프라인 단계별 규칙 + 영상별 검수 체크리스트 9항. |

---

## 1. 적용되는 정책 스택 (한 눈에)

YouTube에 영상을 올리는 순간 다음 4개 정책이 동시에 적용되며, **하나라도 위반하면 수익화 박탈 또는 계정 종료**가 가능하다.

| 정책 | 위반 시 결과 | 1차 자료 |
|------|------------|---------|
| **Community Guidelines** (커뮤니티 가이드) | Strike → 90일 내 3회면 계정 영구 종료 | https://support.google.com/youtube/answer/9288567 |
| **Copyright** (저작권) | Strike or Content ID claim → 수익 분배/차단 | https://www.youtube.com/howyoutubeworks/policies/copyright/ |
| **Channel Monetization Policies** (YPP) | YPP 자격 박탈 / 채널 단위 demonetize | https://support.google.com/youtube/answer/1311392 |
| **Advertiser-Friendly Content Guidelines** (AFG) | 영상 단위 노란딱지(제한 광고) / 빨간딱지(광고 0) | https://support.google.com/youtube/answer/6162278 |

**중요**: Shorts도 위 4개를 100% 동일하게 적용받는다. Shorts 피드는 "브랜드 안전 민감도"가 더 높아 롱폼이라면 통과할 콘텐츠도 Shorts에서는 demonetize되는 경우가 있다.

---

## 2. utube-shorts-jp이 직면한 5대 리스크

본 앱의 파이프라인 특성(타인 영상 2개를 합성·번역해서 재업로드)이 정책의 **회색지대**에 정확히 위치한다. 아래 5개를 우선순위 순으로 관리한다.

### 2.1 🔴 Reused Content (재사용 콘텐츠) — **최대 리스크**

> "Reused content is content that is not clearly your own original creation and may already be on YouTube or another online source with no added significant original commentary, substantive modifications, or educational or entertainment value." — YouTube 공식

**왜 본 앱이 위험한가**: 우리는 (B) 해외 원본을 영상 베이스로 쓰고, (A) 한국 숏츠의 컷 타이밍을 그대로 복제한다. **YouTube 입장에서는 "두 영상의 합성본"으로 보이고, 원작자 허락 없이 번역만 한 경우 Reused Content로 분류 가능**. 2026년에 **demonetization 1위 사유**가 reused content로 보고됨.

**판정 기준 (YouTube 공식 예시)**:
- ✅ **허용**: critical review, 영화 장면 재해석 with 새 보이스오버, 스포츠 재방송 with 전략 해설, 댓글이 포함된 reaction, 시각/청각 효과를 substantive하게 추가한 편집, 화면에 출연자(creator) 등장
- ❌ **금지**: TV 프로그램 컷 단순 모음, SNS 영상 단순 모음, 다른 곡으로 단순 변경(원곡 + 다른 가사/속도), 단순 다운로드+재업로드, 비언어적 reaction(말없이 표정만)

**본 앱의 회피 전략 (필수, §3·§4에서 강제)**:
1. **나레이션은 단순 번역이 아닌 의역+해설** — 원본에 없는 코멘트/맥락/문화 설명 1개 이상 강제 (번역팀 가이드)
2. **편집 리듬은 한국 숏츠 차용하되 비주얼은 원본 + 추가 그래픽 1개 이상** (자막 강조, 줌, 컷인 등 편집팀 산출물에 포함)
3. **9:16 크롭 + 자막 번인 자체가 transformation** — 단, 그것만으로는 부족하다고 가정하고 위 1·2를 항상 동반
4. **검수팀 게이트**: "이 영상이 원본과 meaningful difference가 있는가?"를 통과 못 하면 업로드 차단

### 2.2 🔴 저작권 / Content ID

> "Translation and redistribution require permission from the content owner. Simply translating someone else's video without permission constitutes copyright infringement."

**왜 본 앱이 위험한가**:
- (B) 원본 영상 자체가 저작물 → **권리자 허락 없이 재업로드 + 번역은 명백히 침해 가능성**
- (B) 원본의 BGM은 Demucs로 보존하므로 **Content ID 자동 매칭 확률 매우 높음**
- "출처 표기" "no copyright intended" 같은 문구는 **YouTube 공식적으로 fair use를 만들지 않음**

**Fair Use 4요소 (YouTube 인용)**:
1. 사용 목적·성격 (교육/비영리/transformative가 유리)
2. 저작물 성격 (사실 > 픽션이 유리)
3. 사용 분량 (적게 + "심장부" 회피가 유리)
4. 시장 영향 (원작자 수익을 해치면 불리)

**본 앱은 4번에서 매우 불리** (원작자 일본 시장 진출을 잠재적으로 가로막을 수 있음).

**회피 전략 (필수)**:
1. **사용 가능한 원본 화이트리스트만 페어 등록 허용** (페어 등록 단계에서 강제)
   - Creative Commons (CC BY) 라이선스 표기가 있는 영상
   - 권리자가 명시적으로 사용 허락한 영상 (이메일/DM 캡처를 `output/{채널}/{video_id}/license.txt`에 보관)
   - 본인이 촬영한 원본
2. **원본 분량 제한**: 원본 영상에서 **연속 5초 이상 동일 클립 금지** (편집팀 자동 검사). 짧게 잘라쓰는 것이 fair use 4요소 #3에 유리
3. **Content ID 사전 검사**: YouTube Studio에서 **unlisted 업로드 직후 Content ID 결과 확인 후 dispute 결정** (자동 업로드 모듈이 결과 fetch)
4. **저작권 로그 의무화**: 모든 페어에 `license_source`, `license_evidence`, `license_verified_at` 컬럼 필수 (Supabase 스키마 강제)

### 2.3 🟡 AI 생성 콘텐츠 미공개 (Synthetic Media Disclosure)

> "Failure to disclose highly realistic AIGC may result in content removal, financial penalties, or suspension from the YouTube Partner Program."

**왜 본 앱이 해당되는가**:
- ElevenLabs로 생성한 일본어 나레이션은 **합성 음성** → 공개 의무 가능성
- "제3자의 목소리 합성"이면 무조건 공개 의무, "본인 목소리 클론"이면 면제

**판정 기준 (YouTube 공식)**:
- ✅ **공개 의무 X**: 미용 필터, 색보정, 흐림 처리, 스크립트 작성에 AI 사용, 본인 목소리 클론, 게임 화면, 명백한 판타지/만화
- 🔴 **공개 의무 O**: 실존 인물의 목소리/얼굴 합성, 실제 일어나지 않은 이벤트의 사실적 묘사, 실존 인물이 하지 않은 발언/행동

**본 앱의 적용**:
- 일본어 나레이터가 **가상 캐릭터(일본 전용 voice ID)이고 실존 인물 사칭이 없으면 → 공개 의무 면제 가능**
- 단, **민감 주제(선거/건강/재난/금융)에 진입하면 즉시 공개 의무** 발동
- 기본 정책: **모든 업로드에 "Modified or Synthetic" 라벨 자동 체크**해서 안전하게 운영 (자동 업로드 모듈 기본값)

**회피 전략**:
1. 업로드 메타데이터에 `altered_content: true` 기본값
2. 영상 설명에 일본어 고지 자동 삽입: `"このビデオの音声はAI（ElevenLabs）で生成されています。"`
3. 실존 인물(연예인/정치인) 음성 클론 절대 금지 (음성팀 voice ID 풀에서 사전 차단)

### 2.4 🟡 광고 친화 가이드라인 (Advertiser-Friendly Guidelines, AFG)

영상 단위 demonetize의 직접 사유. **Shorts 피드는 브랜드 민감도 더 높음**.

| 카테고리 | 노란딱지 트리거 | 빨간딱지 트리거 |
|---------|--------------|--------------|
| 부적절한 언어 | 제목/썸네일에 욕설(시발/지랄급), 영상 내 욕설 비중 높음 | 제목/썸네일 f-word, 혐오 슬러 |
| 폭력 | 부상이 보이는 격투, 게임 폭력 첫 7초 | 비교육 시신, 폭력 미화 |
| 성인 | 성적 제목/썸네일, 노출 위주 댄스 | 성기 노출, 성행위 |
| 충격 | 모자이크 없는 의료 시술 디테일 | 단순 충격 목적 |
| 위험 행위 | 부상 동반 챌린지, 심한 장난 | 자해 챌린지, 잘못된 건강 정보, 백신 반대 |
| 증오 | 교육 목적 슬러 인용 | 보호 집단 비방, 혐오 단체 홍보 |
| 마약 | 교육적/회복 서사 | 사용 권장, 구매 방법 |
| 총기 | 통제 환경 외 사용, 보호장비 없는 BB탄 | 제작/개조 가이드, 30+ 매거진 |
| 논쟁 이슈 | 예술/교육 묘사 | 그래픽 묘사, 섭식장애 트리거 |
| 민감 사건 | 보도/다큐로서의 다룸 | 이용/조롱/정당화 |
| 부정행위 조장 | 교육적/저널리즘 언급 | 무단 접근 방법, 위조 가이드 |

**본 앱의 회피 전략**:
1. **번역팀 톤 가이드**: 욕설은 일본어로 옮길 때 톤 다운 (`마지막 ☆`, `クソ` 정도까지만, `Fxxk`/`バカ`는 자막 가능, `クズ`/혐오어 회피)
2. **검수팀 자동 검사**: 자막 텍스트에 빨간딱지 키워드 정규식 매칭 (`\b(시발|좆|개새끼|병신)\b` 등) → 인간 게이트
3. **민감 주제 영상 자동 거부**: 페어 등록 시 (B) 원본 메타데이터에 `military|war|abortion|suicide` 등 키워드 있으면 발굴팀이 사전 차단

### 2.5 🟡 스팸·오인 메타데이터 (Spam, Deceptive Practices)

2025년 7월 *Screen Culture*, *KH Studio* 채널이 AI 가짜 영화 예고편으로 **2백만 구독자에도 종료**됨. **AI + 오인 썸네일 조합은 즉시 종료 트랙**.

**금지 행위**:
- 썸네일/제목에 영상 내용과 무관한 셀러브리티 사진
- 가짜 뉴스 키워드(`BREAKING`, `JUST IN`)로 클릭 유도 후 본문은 무관
- 스튜디오 공식인 척 위장 (`OFFICIAL TRAILER` 등)
- AI 합성을 fan-made/synthetic 표시 없이 사실인 척

**본 앱의 회피 전략**:
1. **제목/설명 자동 검사**: BREAKING/速報/独占 등 가짜 뉴스 키워드 정규식 차단
2. **썸네일은 원본 첫 프레임 자동** (Shorts 기본 동작) — 별도 합성 썸네일 금지
3. **설명란에 자동 삽입되는 표준 푸터**:
   ```
   元動画: {원본 URL}  /  原作者: {채널명}
   日本語ナレーション: AI生成 (ElevenLabs)
   #shorts #日本語
   ```

---

## 3. 파이프라인 단계별 정책 게이트

PRD §4의 5단계 파이프라인에 정책 게이트를 매핑한다. 각 게이트 통과 못 하면 다음 단계로 진행 불가.

### ① 발굴 단계 (사용자 + 검색팀)

| 게이트 | 검사 항목 | 자동/수동 |
|-------|---------|---------|
| G1.1 | (A) 한국 숏츠가 100만뷰+, 정상 채널(strike 없음) | 자동 (YouTube Data API) |
| G1.2 | (A) 메타데이터에 §2.4 빨간딱지 키워드 없음 | 자동 (정규식) |
| G1.3 | (A)·(B) 둘 다 1년 이내 발행 (트렌드 적합성) | 자동 |

### ② 페어 등록 단계 (사용자 + 분석팀)

| 게이트 | 검사 항목 | 자동/수동 |
|-------|---------|---------|
| G2.1 | (B) 원본의 라이선스 증빙 1개 이상 첨부 (CC / 권리자 허락 / 본인 촬영) | **수동 + DB 강제** |
| G2.2 | (B) 채널이 동일 콘텐츠 재배포에 명시적 거부 표명 없음 | 수동 |
| G2.3 | (A)와 (B)가 의미적으로 동일 사건/주제임을 사용자가 확인 | 수동 |

> **DB 제약**: `pairs.license_source` NOT NULL, `pairs.license_evidence_url` NOT NULL. 비어있으면 변환팀이 픽업 못 함.

### ③ 변환 단계 (번역/음성/편집팀)

| 게이트 | 검사 항목 | 책임 팀 |
|-------|---------|--------|
| G3.1 | 번역본에 원본에 없는 코멘트/문화 설명 ≥ 1개 (transformation 증거) | 번역팀 |
| G3.2 | 동일 클립 연속 사용 < 5초 (저작권 §2.2 #2) | 편집팀 (ffmpeg 검사) |
| G3.3 | 음성팀 voice ID는 화이트리스트(가상 캐릭터)에서만 선택 | 음성팀 |
| G3.4 | 자막 텍스트에 빨간딱지 키워드 없음 | 검수팀 |
| G3.5 | 9:16 크롭 + 자막 번인 + 추가 그래픽 ≥ 1개 적용 | 편집팀 |

### ④ 검수 + 업로드 단계 (검수팀 + 업로드팀)

| 게이트 | 검사 항목 | 책임 |
|-------|---------|-----|
| G4.1 | §6 영상별 체크리스트 9항 모두 통과 | 검수팀 (인간 + AI) |
| G4.2 | 업로드 시 `defaultLanguage: "ja"` + `altered_content: true` + 표준 푸터 | 업로드팀 (자동) |
| G4.3 | 비공개(unlisted) 업로드 후 5분 이내 Content ID 결과 fetch | 업로드팀 (자동) |
| G4.4 | Content ID claim이 monetize claim이면 OK, block claim이면 즉시 비공개 유지 + 알림 | 업로드팀 |

### ⑤ 공개 전환 단계

| 게이트 | 검사 항목 | 책임 |
|-------|---------|-----|
| G5.1 | 사용자가 모바일 BGM 추가 완료 체크 | 사용자 |
| G5.2 | G4.4의 Content ID 상태가 "block 없음"인지 재확인 | 업로드팀 |
| G5.3 | 채널 strike 잔여 0개 (90일 내) | 업로드팀 (Data API) |

---

## 4. 동일 콘텐츠 분류 회피 — Transformation 7가지

YouTube 알고리즘이 본 앱 결과물을 (A) 또는 (B)와 "동일 콘텐츠"로 분류하면 노출이 박살난다. 아래 **7개 중 최소 4개를 모든 영상에 적용**하도록 편집팀·번역팀 가이드에 강제 (검수팀 G3.1~G3.5 통과 조건).

1. **언어 변경 (필수)** — 한국어→일본어. 자동 적용
2. **나레이션 추가 해설** — 원본에 없는 문화/맥락 코멘트 ≥ 1개 (번역팀)
3. **세로 9:16 + 자막 번인** — 가로 원본일 경우 자동 transformation 1점 (편집팀)
4. **노란 강조 자막 스타일** — ASS 효과 (편집팀)
5. **컷 리듬 모방하되 컷 수 ±10% 변형** — 한국 숏츠 그대로 복제 X (분석팀)
6. **추가 그래픽 ≥ 1개** — 줌인/화살표/이모지/하이라이트 박스 (편집팀)
7. **첫 3초 후킹 재구성** — 원본 첫 프레임 ≠ 본 앱 첫 프레임 (편집팀)

> **trade-off**: 너무 많이 변형하면 한국 숏츠의 "검증된 후킹"이 약해짐. 4개 적용이 안전선.

---

## 5. 채널 위험 관리 — Strike 시스템

**동일 90일 윈도우 안에서**:
- 1차 Strike: 1주일 업로드 정지
- 2차 Strike: 2주일 업로드 정지
- 3차 Strike: **계정 영구 종료, 전 영상 삭제, 연결 채널 영향**

**Copyright Strike와 Community Guidelines Strike는 별도 카운트**되지만 **둘 다 3회면 종료**.

**본 앱의 채널 보호 전략**:
1. **멀티 채널 격리** (PRD에 이미 반영) — 한 채널 종료가 전체로 번지지 않게 분리
2. **새 채널 워밍업 기간**: 첫 30일은 하루 1편, 정책 위반 0건 확인 후 가속
3. **Strike 발생 시 즉시 자동 정지**: 업로드팀이 매일 채널 strike 상태 polling → 발견 즉시 모든 자동 업로드 일시정지
4. **이의신청 21일 데드라인** 자동 알림 — Reused Content 어필 성공률 30~40% (낮음, 미리 증빙 자료 준비)

---

## 6. 영상별 사전 체크리스트 (검수팀 게이트 G4.1)

각 영상이 **퍼블릭으로 전환되기 전** 검수팀 팀장이 통과시켜야 하는 9항. 어드민 `/upload` 페이지의 체크박스 UI로 구현.

```
[ ] 1. (B) 원본 라이선스 증빙 첨부됨 (CC / 허락 메일 / 본인 촬영)
[ ] 2. 일본어 번역본에 원본에 없는 해설/코멘트 1개 이상 존재
[ ] 3. 영상에서 동일 클립 연속 사용 < 5초
[ ] 4. §4 transformation 7개 중 4개 이상 적용 확인
[ ] 5. 자막 텍스트에 빨간딱지 키워드 0건
[ ] 6. 음성은 화이트리스트 voice ID (실존 인물 클론 X)
[ ] 7. 제목/설명에 가짜 뉴스 키워드 (BREAKING/速報) 0건
[ ] 8. 설명란 표준 푸터 자동 삽입 확인 (원본 URL/원작자/AI 고지)
[ ] 9. 업로드 메타데이터에 altered_content=true + defaultLanguage=ja
```

> 1, 3, 5~9는 자동 검사로 ✅ 채워주고, **2와 4만 인간 게이트**로 남김. 영상당 인간 검수 < 30초 목표.

---

## 7. 운영 SOP

### 7.1 정책 변경 모니터링
- 매주 월요일: `https://support.google.com/youtube/answer/1311392` 변경 확인 (자동 fetch + diff)
- 변경 발견 시 본 문서 §0 변경 이력 갱신 + 슬랙 알림

### 7.2 Strike 발생 시 대응 플레이북
1. 즉시 해당 채널의 자동 업로드 일시정지 (`channels.upload_paused = true`)
2. Strike 사유 분류 (CG / Copyright / Spam / Reused)
3. 어필 가능성 판단 (성공률: Spam 45% / Misinfo 28% / Harassment 12% / Reused 30~40%)
4. 21일 이내 어필 또는 수용 결정
5. 같은 사유 재발 방지를 위해 본 문서에 사례 기록

### 7.3 Content ID Claim 발생 시
- **monetize claim** (수익이 권리자에게 감) → 그대로 유지, 데이터 수집
- **block claim** (특정 국가/전세계 차단) → 영상 비공개로 되돌리고 재변환 대기열로
- **takedown claim** (저작권 strike 동반) → 채널 영향 평가 후 dispute 또는 삭제

### 7.4 권리자 사전 컨택 템플릿 (G2.1 증빙용)
```
件名: あなたの動画を日本市場向けにローカライズさせてください
本文: 〜 (DM/이메일 템플릿. 본 문서 v1.1에서 추가 예정)
```

---

## 8. 1차 자료 (Primary Sources)

본 문서의 모든 규칙은 아래 공식 문서에서 도출. 정책 변경 시 본 링크들을 최우선으로 재확인.

### YouTube 공식
- [YouTube Channel Monetization Policies](https://support.google.com/youtube/answer/1311392) — YPP 4개 정책 통합
- [Reused Content FAQ](https://support.google.com/youtube/community-guide/271248162) — 공식 Q&A
- [Community Guidelines](https://support.google.com/youtube/answer/9288567) — 커뮤니티 가이드 본문
- [Advertiser-Friendly Content Guidelines](https://support.google.com/youtube/answer/6162278) — AFG 본문 (노란/빨간딱지 기준)
- [Fair Use on YouTube](https://support.google.com/youtube/answer/9783148) — Fair Use 4요소
- [Copyright Strike Basics](https://support.google.com/youtube/answer/2814000) — 저작권 strike
- [Community Guidelines Strike Basics](https://support.google.com/youtube/answer/2802032) — CG strike 3회 종료
- [Disclosing Altered/Synthetic Content](https://support.google.com/youtube/answer/14328491) — AI 콘텐츠 라벨
- [How Content ID Works](https://support.google.com/youtube/answer/2797370) — Content ID 매칭/dispute
- [Spam, Deceptive Practices & Scams](https://support.google.com/youtube/answer/2801973) — 메타데이터 오인
- [Upcoming Ad Guideline Updates](https://support.google.com/youtube/answer/9725604) — 정기 업데이트 추적용
- [How YouTube Works — Policies](https://www.youtube.com/howyoutubeworks/our-policies/) — 메타 페이지
- [How YouTube Works — Copyright](https://www.youtube.com/howyoutubeworks/policies/copyright/) — 저작권 본문

### 일본어 공식 (일본 채널 운영 시 참고)
- [YouTubeのチャンネル収益化ポリシー](https://support.google.com/youtube/answer/1311392?hl=ja)
- [著作権およびフェアユースに関するポリシー](https://www.youtube.com/intl/ALL_jp/howyoutubeworks/policies/copyright/)
- [YouTubeのコミュニティガイドライン](https://support.google.com/youtube/answer/9288567?hl=ja)

### 2026년 변경 추적
- July 2025: "repetitious content" → "inauthentic content" 개명 (mass-produced 콘텐츠 명시적 금지)
- March 2025: 광고 적합성 인간 검토 강화 (수익화 결정 최대 24시간 지연)
- January 2026: 일부 controversial 주제(낙태, 성적 학대 논의 등) 수익화 완화

---

## 9. 미해결 의사결정 TODO

본 문서를 운영에 적용하기 위해 사용자가 결정해줘야 할 항목:

- [ ] (B) 원본 라이선스 화이트리스트 정책: CC만 허용? 권리자 허락 메일도 허용? **사용자 답변 필요**
- [ ] 권리자 컨택 템플릿(§7.4) — 일본어/한국어/영어 버전 어디까지?
- [ ] 채널별 voice ID 화이트리스트 — 음성팀 PRD와 동기화
- [ ] 빨간딱지 키워드 정규식 초기 셋 (한국어/일본어 각 50개)
- [ ] Strike 발생 시 자동 업로드 정지 범위 — 발생 채널만 vs 전체 채널?
- [ ] §4 transformation 7개 중 "4개 이상" 기준이 적절한가, 5개로 강화할 것인가?

---

> **본 문서는 살아있는 문서**다. YouTube 정책은 분기 단위로 바뀐다. 영상 1편이라도 strike를 받으면 그 사례를 §7에 기록하고 §3 게이트를 강화한다 — utube-start의 **하네스 엔지니어링** 원칙 그대로.
