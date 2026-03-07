-- SpeakMate Demo Seed Data
-- Run AFTER creating demo user via Supabase Auth (signup with email below)
-- Usage: psql $DATABASE_URL -f seed.sql
-- OR: paste into Supabase SQL Editor

-- ============================================================
-- 0. DEMO USER — must match an existing auth.users entry
--    Sign up with: demo@speakmate.app / password123
--    Then paste the UUID from auth.users here:
-- ============================================================
DO $$
DECLARE
    demo_uid UUID;
BEGIN
    -- Find demo user by email
    SELECT id INTO demo_uid FROM auth.users WHERE email = 'demo@speakmate.app' LIMIT 1;

    IF demo_uid IS NULL THEN
        RAISE EXCEPTION 'Demo user not found! Sign up with demo@speakmate.app first.';
    END IF;

    -- Update profile
    UPDATE public.profiles SET
        full_name = 'Demo User',
        total_exp = 225
    WHERE id = demo_uid;

    -- ============================================================
    -- 1. STORY BANK — 3 stories
    -- ============================================================
    INSERT INTO public.story_entries (id, user_id, title, raw_input, input_method, framework, structured, full_script, estimated_duration, tags, status, practice_count, last_score)
    VALUES
    (
        'a1111111-1111-1111-1111-111111111111',
        demo_uid,
        'Fix loi database luc demo do an',
        'Hoi do an mon CSDL, luc demo thi database bi loi. Minh phai fix ngay truoc mat thay giao.',
        'text',
        'STAR',
        '{
            "situation": "Demo do an cuoi ky mon Co so du lieu truoc 3 thay giao cham. Nhom 4 nguoi, minh la backend lead.",
            "task": "Database PostgreSQL bi loi connection pool exhausted ngay giua luc demo. Thay giao dang cho.",
            "action": "Binh tinh mo terminal, check connection count, phat hien leak o ORM. Fix bang cach them connection.release() vao finally block. Restart server trong 2 phut.",
            "result": "Demo tiep tuc thanh cong. Thay khen xu ly tinh huong tot. Nhom dat 9.5 diem."
        }',
        'Trong ky thi cuoi ky mon Co so du lieu, nhom minh 4 nguoi demo truoc 3 thay giao. Minh la backend lead, chiu trach nhiem toan bo he thong database. Giua luc demo, PostgreSQL bat ngo bao loi connection pool exhausted. Thay giao dang nhin chung toi cho doi. Minh binh tinh mo terminal, check connection count va phat hien ORM dang leak connections — thieu connection.release() trong finally block. Minh fix ngay, restart server trong 2 phut. Demo tiep tuc thanh cong va nhom dat 9.5 diem. Thay con khen minh xu ly tinh huong rat chuyen nghiep.',
        45,
        ARRAY['xu ly ap luc', 'backend', 'problem-solving'],
        'battle-tested',
        3,
        82
    ),
    (
        'a2222222-2222-2222-2222-222222222222',
        demo_uid,
        'De xuat kien truc microservice cho team',
        'O cong ty thuc tap, minh de xuat chuyen tu monolith sang microservice cho du an quan ly kho.',
        'text',
        'STAR',
        '{
            "situation": "Thuc tap tai cong ty startup 15 nguoi. Du an quan ly kho dang la monolith Node.js, deploy mat 20 phut, bug o 1 module lam sap ca he thong.",
            "task": "Minh duoc giao nghien cuu giai phap cai thien architecture. Team lead muon co proposal trong 1 tuan.",
            "action": "Nghien cuu microservice pattern, ve diagram tren Excalidraw, trinh bay cho team. De xuat tach 3 service: inventory, orders, notifications. Dung Docker Compose cho local dev.",
            "result": "Team lead dong y pilot voi module notifications truoc. Sau 2 tuan, deploy time giam 70%. Minh duoc moi lam full-time."
        }',
        'Khi thuc tap tai mot startup 15 nguoi, du an quan ly kho dang chay tren monolith Node.js. Moi lan deploy mat 20 phut, va bug o bat ky module nao cung co the lam sap toan bo he thong. Team lead giao minh nghien cuu giai phap. Minh da nghien cuu microservice pattern, ve kien truc tren Excalidraw va trinh bay cho ca team. Minh de xuat tach thanh 3 service doc lap: inventory, orders va notifications, su dung Docker Compose cho local dev. Team lead dong y pilot voi module notifications truoc. Sau 2 tuan trien khai, deploy time giam 70% va he thong on dinh hon han. Minh duoc moi lam full-time sau do.',
        60,
        ARRAY['teamwork', 'technical-leadership', 'architecture'],
        'ready',
        1,
        65
    ),
    (
        'a3333333-3333-3333-3333-333333333333',
        demo_uid,
        'Ly do toi xay SpeakMate',
        'Minh xay SpeakMate vi ban than minh so noi tieng Anh, muon tao 1 app giup nguoi Viet luyen tap an toan.',
        'text',
        'STAR',
        '{
            "situation": "Sinh vien nam 3 IT, tieng Anh doc doc OK nhung noi thi run. Mat co hoi thuc tap vi phong van tieng Anh that bai.",
            "task": "Muon tao 1 san pham giup nguoi Viet luyen noi tieng Anh ma khong bi xau ho, khong can nguoi that.",
            "action": "Dang phat trien SpeakMate — ung dung AI luyen noi tieng Anh voi 3 agent: Brain (tao kich ban), Voice (hoi thoai realtime), Analyst (danh gia).",
            "result": "Dang trong giai doan MVP. Da test voi 5 ban, phan hoi tich cuc. Tham gia AI Young Guru 2026."
        }',
        null,
        30,
        ARRAY['gioi thieu ban than', 'motivation', 'product'],
        'draft',
        0,
        null
    );

    -- ============================================================
    -- 2. PRACTICE SESSIONS — 3 sessions (3 days ago, 2 days ago, today)
    -- ============================================================
    INSERT INTO public.practice_sessions (id, user_id, mode, scenario, status, started_at, completed_at, created_at)
    VALUES
    -- Session 1: Presentation, 3 days ago
    (
        'b1111111-1111-1111-1111-111111111111',
        demo_uid,
        'stage',
        '{
            "scenario": {
                "scenarioName": "Thuyet trinh do an truoc hoi dong",
                "topic": "Bao ve do an cuoi ky",
                "interviewerPersona": "Thay Nguyen — giao vien nghiem khac nhung cong bang, hay hoi cau kho",
                "goals": ["Trinh bay ro rang kien truc he thong", "Tra loi cau hoi phan bien tu tin"],
                "startingTurns": [{"speaker": "AI", "line": "Chao em, em hay bat dau trinh bay do an cua minh di.", "emotion": "neutral"}]
            },
            "evalRules": {
                "categories": [
                    {"category": "Su tu tin", "weight": 30, "description": "Tu nhien, khong run"},
                    {"category": "Mach lac", "weight": 30, "description": "Logic, co cau truc"},
                    {"category": "Tu vung", "weight": 20, "description": "Dung tu chuyen nganh"},
                    {"category": "Xu ly cau hoi", "weight": 20, "description": "Phan bien tot"}
                ]
            }
        }',
        'completed',
        now() - interval '3 days' - interval '2 hours',
        now() - interval '3 days' - interval '1 hour 45 minutes',
        now() - interval '3 days' - interval '2 hours'
    ),
    -- Session 2: Interview, 2 days ago
    (
        'b2222222-2222-2222-2222-222222222222',
        demo_uid,
        'safe',
        '{
            "scenario": {
                "scenarioName": "Phong van thuc tap Backend Developer",
                "jobTitle": "Backend Developer Intern",
                "interviewerPersona": "Chi Linh — HR than thien, hoi ve kinh nghiem va dong luc",
                "goals": ["Gioi thieu ban than tu nhien", "Chia se kinh nghiem du an", "The hien dong luc hoc hoi"],
                "startingTurns": [{"speaker": "AI", "line": "Chao em, cam on em da den phong van. Em co the gioi thieu ban than duoc khong?", "emotion": "encouraging"}]
            },
            "evalRules": {
                "categories": [
                    {"category": "Su tu tin", "weight": 40, "description": "Tu nhien khi giao tiep"},
                    {"category": "Mach lac", "weight": 30, "description": "Cau tra loi co logic"},
                    {"category": "Tu vung", "weight": 30, "description": "Dung tu phu hop"}
                ]
            }
        }',
        'completed',
        now() - interval '2 days' - interval '1 hour',
        now() - interval '2 days' - interval '45 minutes',
        now() - interval '2 days' - interval '1 hour'
    ),
    -- Session 3: Pitch hackathon, today
    (
        'b3333333-3333-3333-3333-333333333333',
        demo_uid,
        'safe',
        '{
            "scenario": {
                "scenarioName": "Pitch SpeakMate tai AI Young Guru",
                "topic": "Pitch startup",
                "interviewerPersona": "Anh Minh — giam khao ky thuat, quan tam den tech stack va kha thi",
                "goals": ["Pitch san pham trong 2 phut", "Giai thich kien truc ky thuat", "Tra loi cau hoi ve thi truong"],
                "startingTurns": [{"speaker": "AI", "line": "Chao ban, hay bat dau pitch san pham cua ban di. Ban co 2 phut.", "emotion": "neutral"}]
            },
            "evalRules": {
                "categories": [
                    {"category": "Su tu tin", "weight": 30, "description": "Thuyet phuc, tu tin"},
                    {"category": "Mach lac", "weight": 25, "description": "Cau truc pitch ro rang"},
                    {"category": "Tu vung", "weight": 20, "description": "Tu ngu chuyen nghiep"},
                    {"category": "Xu ly cau hoi", "weight": 25, "description": "Phan hoi nhanh, chinh xac"}
                ]
            }
        }',
        'completed',
        now() - interval '1 hour',
        now() - interval '45 minutes',
        now() - interval '1 hour'
    );

    -- ============================================================
    -- 3. CONVERSATION TURNS
    -- ============================================================
    -- Session 1 turns (presentation)
    INSERT INTO public.conversation_turns (session_id, turn_number, user_transcript, ai_response, created_at) VALUES
    ('b1111111-1111-1111-1111-111111111111', 1, null, 'Chao em, em hay bat dau trinh bay do an cua minh di.', now() - interval '3 days'),
    ('b1111111-1111-1111-1111-111111111111', 2, 'Da thay, do an cua em la ung dung quan ly thu vien su dung Node.js va PostgreSQL.', 'Em co the giai thich tai sao chon PostgreSQL ma khong phai MongoDB?', now() - interval '3 days'),
    ('b1111111-1111-1111-1111-111111111111', 3, 'Du lieu thu vien co nhieu quan he nhu sach, tac gia, doc gia nen em chon SQL de dam bao tinh nhat quan.', 'Tot, vay em xu ly the nao khi co nhieu nguoi muon muon cung 1 cuon sach?', now() - interval '3 days'),
    ('b1111111-1111-1111-1111-111111111111', 4, 'Em su dung transaction voi row-level locking de tranh race condition.', 'Rat tot. Em da test voi bao nhieu nguoi dung dong thoi?', now() - interval '3 days');

    -- Session 2 turns (interview)
    INSERT INTO public.conversation_turns (session_id, turn_number, user_transcript, ai_response, created_at) VALUES
    ('b2222222-2222-2222-2222-222222222222', 1, null, 'Chao em, cam on em da den phong van. Em co the gioi thieu ban than duoc khong?', now() - interval '2 days'),
    ('b2222222-2222-2222-2222-222222222222', 2, 'Chao chi, em la Huy, sinh vien nam 3 nganh CNTT. Em co kinh nghiem lam backend voi Node.js va Python.', 'Hay qua! Em co the ke ve 1 du an ma em tam dac nhat khong?', now() - interval '2 days'),
    ('b2222222-2222-2222-2222-222222222222', 3, 'Du an em thich nhat la SpeakMate, ung dung AI giup luyen noi tieng Anh. Em tu thiet ke kien truc va code toan bo backend.', 'Nghe thu vi do! Vay kho khan lon nhat em gap khi lam du an nay la gi?', now() - interval '2 days'),
    ('b2222222-2222-2222-2222-222222222222', 4, 'Kho nhat la xu ly do tre am thanh. Em phai toi uu pipeline tu VAD den TTS de giam latency xuong duoi 2 giay.', 'Em giai quyet no the nao?', now() - interval '2 days'),
    ('b2222222-2222-2222-2222-222222222222', 5, 'Em dung WebRTC de stream audio, va chay cac model AI tren GPU cloud de xu ly song song.', 'Tuyet voi, em co tinh than ky thuat rat tot.', now() - interval '2 days');

    -- Session 3 turns (pitch)
    INSERT INTO public.conversation_turns (session_id, turn_number, user_transcript, ai_response, created_at) VALUES
    ('b3333333-3333-3333-3333-333333333333', 1, null, 'Chao ban, hay bat dau pitch san pham cua ban di. Ban co 2 phut.', now() - interval '1 hour'),
    ('b3333333-3333-3333-3333-333333333333', 2, 'Xin chao, toi la Huy. SpeakMate la ung dung AI giup sinh vien Viet Nam luyen noi tieng Anh mot cach tu nhien va an toan.', 'San pham giai quyet van de gi cu the?', now() - interval '1 hour'),
    ('b3333333-3333-3333-3333-333333333333', 3, 'Nguoi Viet biet tieng Anh nhung so noi. SpeakMate tao moi truong luyen tap voi AI, khong so bi danh gia.', 'Tech stack ban dung la gi? Lam sao de do tre thap?', now() - interval '1 hour'),
    ('b3333333-3333-3333-3333-333333333333', 4, 'Chung toi dung 3 AI agent: Brain tao kich ban, Voice xu ly hoi thoai realtime qua WebRTC, va Analyst danh gia sau phien. Tat ca chay tren GPU serverless.', 'Vay chi phi van hanh the nao? Co scale duoc khong?', now() - interval '1 hour'),
    ('b3333333-3333-3333-3333-333333333333', 5, 'GPU chi chay khi co nguoi luyen tap, nen chi phi theo phut. Kien truc serverless cho phep scale tu dong.', 'Cam on, pitch rat tot. Toi an tuong voi kien truc ky thuat.', now() - interval '1 hour');

    -- ============================================================
    -- 4. EVALUATIONS
    -- ============================================================
    INSERT INTO public.evaluations (session_id, overall_score, overall_feedback, radar_data, strengths, improvements, turn_highlights)
    VALUES
    -- Session 1: score 58
    (
        'b1111111-1111-1111-1111-111111111111',
        58,
        'Trinh bay co kien thuc ky thuat tot nhung con thieu tu tin. Can luyen them cach dien dat.',
        '[{"category": "Su tu tin", "score": 50}, {"category": "Mach lac", "score": 65}, {"category": "Tu vung", "score": 60}, {"category": "Xu ly cau hoi", "score": 55}]',
        '["Kien thuc ky thuat vung vang ve database", "Tra loi dung trong tam cau hoi"]',
        '["Can noi to hon va tu tin hon", "Nen dua them vi du cu the", "Tranh dung qua nhieu tu dem nhu um, a"]',
        '[{"turn": 2, "type": "strength", "comment": "Giai thich chon PostgreSQL rat logic"}, {"turn": 4, "type": "improvement", "comment": "Cau tra loi ve testing con chung chung"}]'
    ),
    -- Session 2: score 65
    (
        'b2222222-2222-2222-2222-222222222222',
        65,
        'Phong van kha tu nhien. Cach ke chuyen ve du an SpeakMate rat thuyet phuc. Can cai thien phan mo dau.',
        '[{"category": "Su tu tin", "score": 60}, {"category": "Mach lac", "score": 70}, {"category": "Tu vung", "score": 65}]',
        '["Ke chuyen ve du an ca nhan rat hay va co cam xuc", "The hien duoc dam me voi cong nghe", "Tra loi luu loat cac cau hoi ky thuat"]',
        '["Phan gioi thieu ban than con ngan va thieu chi tiet", "Nen chuan bi san 1-2 cau hoi cho nha tuyen dung"]',
        '[{"turn": 3, "type": "strength", "comment": "Ke ve SpeakMate rat tu nhien va dam me"}, {"turn": 5, "type": "strength", "comment": "Giai thich WebRTC + GPU cloud rat an tuong"}]'
    ),
    -- Session 3: score 72
    (
        'b3333333-3333-3333-3333-333333333333',
        72,
        'Pitch tot, cau truc ro rang. Tech stack trinh bay thuyet phuc. Can them phan thi truong va so lieu.',
        '[{"category": "Su tu tin", "score": 75}, {"category": "Mach lac", "score": 78}, {"category": "Tu vung", "score": 68}, {"category": "Xu ly cau hoi", "score": 70}]',
        '["Cau truc pitch ro rang: van de → giai phap → cong nghe", "Giai thich kien truc 3 agent rat de hieu", "Tu tin khi tra loi cau hoi ve chi phi va scale"]',
        '["Nen them so lieu cu the: bao nhieu nguoi da test, ket qua ra sao", "Phan mo dau can hook manh hon de thu hut su chu y"]',
        '[{"turn": 2, "type": "strength", "comment": "Mo dau ngan gon, di thang vao van de"}, {"turn": 4, "type": "strength", "comment": "Giai thich 3 AI agent cuc ky ro rang"}, {"turn": 3, "type": "improvement", "comment": "Can them so lieu ve nguoi dung de thuyet phuc hon"}]'
    );

    -- ============================================================
    -- 5. CHALLENGES
    -- ============================================================
    INSERT INTO public.realworld_challenges (id, user_id, session_id, title, description, opener_hints, status, exp_reward, deadline, created_at, updated_at)
    VALUES
    -- Challenge 1: completed
    (
        'c1111111-1111-1111-1111-111111111111',
        demo_uid,
        'b2222222-2222-2222-2222-222222222222',
        'Chao 1 ban moi trong lop',
        'Hay bat chuyen voi 1 ban ma ban chua tung noi chuyen trong lop. Hoi ve mon hoc hoac bai tap.',
        '["Oi ban oi, bai tap mon nay kho qua ha?", "Minh la Huy, ban hoc nganh gi vay?", "Ban co muon lam nhom chung khong?"]',
        'completed',
        75,
        now() - interval '5 days',
        now() - interval '7 days',
        now() - interval '5 days'
    ),
    -- Challenge 2: pending (current)
    (
        'c2222222-2222-2222-2222-222222222222',
        demo_uid,
        'b3333333-3333-3333-3333-333333333333',
        'Hoi giang vien 1 cau phan bien',
        'Trong buoi hoc toi, hay dat 1 cau hoi phan bien cho giang vien ve noi dung bai giang. Cau hoi phai the hien su suy nghi sau.',
        '["Thay oi, neu X thi sao lai khong dung Y?", "Em thac mac tai sao approach nay lai tot hon?", "Co truong hop nao ma pattern nay khong ap dung duoc khong a?"]',
        'pending',
        100,
        now() + interval '3 days',
        now() - interval '1 day',
        now() - interval '1 day'
    );

    -- ============================================================
    -- 6. EXP LOGS
    -- ============================================================
    INSERT INTO public.user_exp_logs (user_id, amount, reason, related_session_id, related_challenge_id, created_at)
    VALUES
    (demo_uid, 50, 'Hoan thanh phien luyen tap', 'b1111111-1111-1111-1111-111111111111', null, now() - interval '3 days'),
    (demo_uid, 50, 'Hoan thanh phien luyen tap', 'b2222222-2222-2222-2222-222222222222', null, now() - interval '2 days'),
    (demo_uid, 75, 'Hoan thanh thu thach: Chao ban moi', null, 'c1111111-1111-1111-1111-111111111111', now() - interval '5 days'),
    (demo_uid, 50, 'Hoan thanh phien luyen tap', 'b3333333-3333-3333-3333-333333333333', null, now() - interval '1 hour');

    -- ============================================================
    -- 7. MENTOR CHAT — 1 session with 4 messages
    -- ============================================================
    INSERT INTO public.mentor_chat_sessions (id, user_id) VALUES
    ('d1111111-1111-1111-1111-111111111111', demo_uid);

    INSERT INTO public.mentor_chat_messages (session_id, role, content, intent, created_at) VALUES
    ('d1111111-1111-1111-1111-111111111111', 'user', 'Ni oi, lam sao de tu tin hon khi noi truoc dam dong?', 'query', now() - interval '2 hours'),
    ('d1111111-1111-1111-1111-111111111111', 'mentor', 'Cau hoi rat hay! Bi quyet la luyen tap nhieu. Ban da luyen 3 phien roi — diem dang tang dan tu 58 len 72. Hay thu bat dau bang 1 cau mo dau da chuan bi san, roi tu do noi tu nhien.', 'support', now() - interval '2 hours'),
    ('d1111111-1111-1111-1111-111111111111', 'user', 'Minh nen luyen gi tiep theo?', 'query', now() - interval '1 hour 50 minutes'),
    ('d1111111-1111-1111-1111-111111111111', 'mentor', 'Dua tren 3 phien gan day, minh thay ban can cai thien phan mo dau. Hay thu che do "Thuyet trinh" va tap trung vao 30 giay dau tien — do la luc nguoi nghe quyet dinh co muon nghe tiep khong.', 'action', now() - interval '1 hour 50 minutes');

    RAISE NOTICE 'Seed data inserted successfully for user %', demo_uid;
END $$;
