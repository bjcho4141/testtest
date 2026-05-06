-- ════════════════════════════════════════════════════════════════
-- 0005 — Seed (운영자 영구 무료 + 기본 데이터)
-- 주의: auth.users 직접 INSERT 금지 (Supabase Auth가 관리)
--      운영자(bjcho9542@gmail.com) 첫 로그인 시 handle_new_user 트리거가
--      profiles row 자동 생성. 그 이후 아래 UPDATE를 1회 수동 실행.
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- ⬇⬇ 운영자 첫 로그인 후 1회 수동 실행 (Supabase SQL Editor)
-- ─────────────────────────────────────────────────────────────
--
--   update public.profiles
--      set role = 'superadmin',
--          subscription_status = 'active',
--          paid_until = '2099-12-31 23:59:59+00'
--    where email = 'bjcho9542@gmail.com';
--
--   -- 검증:
--   select id, email, role, subscription_status, paid_until,
--          public.is_paid(id) as paid_gate_pass
--     from public.profiles
--    where email = 'bjcho9542@gmail.com';
--
-- ─────────────────────────────────────────────────────────────

-- is_paid() 가 email 'bjcho9542@gmail.com' 또는 role='superadmin' 조건을
-- 이미 포함하므로, 위 UPDATE 없이도 결제 게이트는 통과한다.
-- 단, role='superadmin' 으로 명시해야 슈퍼어드민 UI/RPC 접근 가능.

-- ─────────────────────────────────────────────────────────────
-- 향후 시드 데이터 자리 (현재는 비움 — Phase 1 이후 채움)
-- ─────────────────────────────────────────────────────────────
-- 예시: 기본 trending_sounds 카테고리, 기본 default_subtitle_style 등

select 'seed migration applied (operator setup is manual via SQL Editor)' as note;
