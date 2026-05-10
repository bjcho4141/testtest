-- shorts_pairs.orientation: 사용자가 등록 시 선택. vertical = 9:16 원본, horizontal = 16:9 원본.
-- horizontal 일 때 letterbox 캔버스의 위·아래 검은 띠에 타이틀/자막 배치.
-- 워커가 ffprobe 로 실측한 결과는 original_meta.detected_orientation 에 별도 저장 (review 시 비교).

alter table public.shorts_pairs
  add column if not exists orientation text not null default 'vertical'
  check (orientation in ('vertical','horizontal'));

comment on column public.shorts_pairs.orientation is
  'User-declared aspect ratio of original source video. vertical=9:16 (Shorts/Reels), horizontal=16:9 (YouTube/broadcast). Workers branch crop+subtitle filters by this value.';

-- RLS 영향 없음 — 기존 정책이 전체 row 커버.
-- 인덱스 불필요 — orientation 단독 쿼리 안 함, 단지 worker 분기용 컬럼.
