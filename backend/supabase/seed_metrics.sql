-- ============================================================
-- SpeakMate — Seed dữ liệu lịch sử cho demo
-- BƯỚC 1: Chạy file này trên Supabase SQL Editor
-- ============================================================

-- ── Migration 009 (idempotent) ──────────────────────────────
ALTER TABLE public.session_metrics
    ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'gym'
        CHECK (source_type IN ('gym', 'realworld')),
    ADD COLUMN IF NOT EXISTS fluency_score INT,
    ADD COLUMN IF NOT EXISTS fluency_note TEXT,
    ADD COLUMN IF NOT EXISTS emotion_trend TEXT,
    ADD COLUMN IF NOT EXISTS emotion_trend_note TEXT,
    ADD COLUMN IF NOT EXISTS transcript TEXT;

ALTER TABLE public.session_metrics ALTER COLUMN session_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_metrics_source_type
    ON public.session_metrics(user_id, source_type, created_at DESC);
-- ────────────────────────────────────────────────────────────

-- Thay thế giá trị này bằng user_id thực từ bảng profiles
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Lấy user đầu tiên trong hệ thống
    SELECT id INTO v_user_id FROM public.profiles ORDER BY created_at LIMIT 1;
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Không tìm thấy user — đăng ký tài khoản trước rồi chạy lại';
        RETURN;
    END IF;

    RAISE NOTICE 'Seeding data cho user: %', v_user_id;

    -- ─────────────────────────────────────────────────
    -- REALWORLD METRICS (5 lượt chia sẻ thực tế trước)
    -- source_type = 'realworld', session_id = NULL
    -- ─────────────────────────────────────────────────

    -- Lượt 1 (cũ nhất — kỹ năng còn yếu)
    INSERT INTO public.session_metrics (
        id, session_id, user_id, source_type,
        coherence_score, jargon_count, jargon_list,
        filler_count, filler_per_minute, filler_list,
        fluency_score, fluency_note,
        emotion_trend, emotion_trend_note,
        avg_response_time, created_at
    ) VALUES (
        gen_random_uuid(), NULL, v_user_id, 'realworld',
        52, 5,
        '[{"word":"synergy","suggestion":"sự phối hợp"},{"word":"KPI","suggestion":"chỉ tiêu"},{"word":"leverage","suggestion":"tận dụng"},{"word":"stakeholder","suggestion":"bên liên quan"},{"word":"deliverable","suggestion":"sản phẩm bàn giao"}]'::jsonb,
        18, 12.5,
        '[{"word":"ờ","count":8},{"word":"tức là","count":6},{"word":"kiểu như","count":4}]'::jsonb,
        58, 'Ngắt câu khá nhiều, lặp ý ở đoạn giữa, câu kết chưa rõ.',
        'unknown', 'Không có đủ dữ liệu',
        NULL, NOW() - INTERVAL '28 days'
    ) ON CONFLICT DO NOTHING;

    -- Lượt 2
    INSERT INTO public.session_metrics (
        id, session_id, user_id, source_type,
        coherence_score, jargon_count, jargon_list,
        filler_count, filler_per_minute, filler_list,
        fluency_score, fluency_note,
        emotion_trend, emotion_trend_note,
        avg_response_time, created_at
    ) VALUES (
        gen_random_uuid(), NULL, v_user_id, 'realworld',
        61, 4,
        '[{"word":"KPI","suggestion":"chỉ tiêu"},{"word":"deadline","suggestion":"hạn chót"},{"word":"feedback","suggestion":"phản hồi"},{"word":"update","suggestion":"cập nhật"}]'::jsonb,
        14, 9.8,
        '[{"word":"ờ","count":5},{"word":"tức là","count":5},{"word":"à","count":4}]'::jsonb,
        63, 'Đỡ ngắt câu hơn lượt trước, nhưng một vài câu còn dang dở.',
        'improved', 'Lo lắng → Bình thường',
        NULL, NOW() - INTERVAL '21 days'
    ) ON CONFLICT DO NOTHING;

    -- Lượt 3
    INSERT INTO public.session_metrics (
        id, session_id, user_id, source_type,
        coherence_score, jargon_count, jargon_list,
        filler_count, filler_per_minute, filler_list,
        fluency_score, fluency_note,
        emotion_trend, emotion_trend_note,
        avg_response_time, created_at
    ) VALUES (
        gen_random_uuid(), NULL, v_user_id, 'realworld',
        68, 3,
        '[{"word":"optimize","suggestion":"tối ưu"},{"word":"scalable","suggestion":"có thể mở rộng"},{"word":"agile","suggestion":"linh hoạt"}]'::jsonb,
        11, 7.2,
        '[{"word":"ờ","count":4},{"word":"tức là","count":4},{"word":"kiểu","count":3}]'::jsonb,
        71, 'Câu chuyện có mạch lạc hơn, ít ngắt câu giữa chừng.',
        'improved', 'Hơi lo → Tự tin hơn',
        NULL, NOW() - INTERVAL '14 days'
    ) ON CONFLICT DO NOTHING;

    -- Lượt 4
    INSERT INTO public.session_metrics (
        id, session_id, user_id, source_type,
        coherence_score, jargon_count, jargon_list,
        filler_count, filler_per_minute, filler_list,
        fluency_score, fluency_note,
        emotion_trend, emotion_trend_note,
        avg_response_time, created_at
    ) VALUES (
        gen_random_uuid(), NULL, v_user_id, 'realworld',
        74, 2,
        '[{"word":"proactive","suggestion":"chủ động"},{"word":"bandwidth","suggestion":"thời gian/nguồn lực"}]'::jsonb,
        8, 5.1,
        '[{"word":"ờ","count":3},{"word":"tức là","count":3},{"word":"à","count":2}]'::jsonb,
        78, 'Câu nói lưu loát, ít ngắt, ý tưởng được sắp xếp rõ hơn.',
        'improved', 'Bình thường → Tự tin hơn',
        NULL, NOW() - INTERVAL '7 days'
    ) ON CONFLICT DO NOTHING;

    -- Lượt 5 (gần nhất)
    INSERT INTO public.session_metrics (
        id, session_id, user_id, source_type,
        coherence_score, jargon_count, jargon_list,
        filler_count, filler_per_minute, filler_list,
        fluency_score, fluency_note,
        emotion_trend, emotion_trend_note,
        avg_response_time, created_at
    ) VALUES (
        gen_random_uuid(), NULL, v_user_id, 'realworld',
        79, 1,
        '[{"word":"leverage","suggestion":"tận dụng"}]'::jsonb,
        6, 3.8,
        '[{"word":"ờ","count":3},{"word":"tức là","count":2},{"word":"kiểu","count":1}]'::jsonb,
        83, 'Nói khá trôi chảy, chỉ vài từ đệm nhỏ không đáng kể.',
        'improved', 'Hơi lo → Rất tự tin',
        NULL, NOW() - INTERVAL '3 days'
    ) ON CONFLICT DO NOTHING;

    -- ─────────────────────────────────────────────────
    -- USER PROGRESS (dashboard ProgressCard)
    -- ─────────────────────────────────────────────────
    INSERT INTO public.user_progress (
        user_id,
        communication_level, total_xp, current_streak,
        badges,
        total_sessions, avg_coherence, avg_response_time,
        story_bank_stats, challenge_stats, emotion_trend,
        updated_at
    ) VALUES (
        v_user_id,
        4, 380, 3,
        '["Khởi động"]'::jsonb,
        7, 68.5, 3.2,
        '{"total":4,"battleReady":2,"fromPractice":1,"uniqueTags":["phỏng vấn","thuyết trình","họp nhóm"]}'::jsonb,
        '{"total":5,"completed":3,"highestDifficulty":3,"completionRate":0.6}'::jsonb,
        '[{"challengeId":"c1","before":"Lo lắng","after":"Tự tin hơn"},{"challengeId":"c2","before":"Hơi lo","after":"Bình thường"},{"challengeId":"c3","before":"Bình thường","after":"Rất tự tin"}]'::jsonb,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        communication_level = EXCLUDED.communication_level,
        total_xp = EXCLUDED.total_xp,
        current_streak = EXCLUDED.current_streak,
        badges = EXCLUDED.badges,
        total_sessions = EXCLUDED.total_sessions,
        avg_coherence = EXCLUDED.avg_coherence,
        avg_response_time = EXCLUDED.avg_response_time,
        story_bank_stats = EXCLUDED.story_bank_stats,
        challenge_stats = EXCLUDED.challenge_stats,
        emotion_trend = EXCLUDED.emotion_trend,
        updated_at = NOW();

    RAISE NOTICE 'Seed hoàn tất cho user: %', v_user_id;
END $$;
