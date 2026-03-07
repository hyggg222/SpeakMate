/**
 * Mock Mentor Ni Chat data for UI/UX testing.
 * Simulates the Personal RAG companion responses with different intents.
 */

export interface MockChatMessage {
    id: string;
    role: 'user' | 'mentor';
    content: string;
    intent?: 'query' | 'action' | 'support' | null;
    actionTaken?: {
        type: string;
        prefillData?: any;
        label: string;
        href: string;
    } | null;
    dataCards?: {
        stories?: any[];
        challenges?: any[];
        progress?: any;
    } | null;
    createdAt: string;
}

export const MOCK_PROACTIVE_MESSAGE: MockChatMessage = {
    id: 'proactive-1',
    role: 'mentor',
    content: 'Chào bạn! Challenge tuần này đang chờ — muốn ôn Story Bank trước không? 💪',
    intent: null,
    createdAt: new Date().toISOString(),
};

/** Simulated conversation covering all 3 intents: query, action, support */
export const MOCK_CONVERSATION: MockChatMessage[] = [
    {
        id: 'proactive-1',
        role: 'mentor',
        content: 'Chào bạn! Mình là Ni, mentor giao tiếp cá nhân của bạn. Bạn có 3 story sẵn sàng và 1 challenge đang chờ. Hôm nay mình giúp gì được nè? 😊',
        intent: null,
        createdAt: '2026-04-20T08:00:00Z',
    },
    // --- QUERY intent: hỏi về Story Bank ---
    {
        id: 'msg-1',
        role: 'user',
        content: 'Em sắp phỏng vấn backend, ôn gì đây Ni?',
        createdAt: '2026-04-20T08:01:00Z',
    },
    {
        id: 'msg-2',
        role: 'mentor',
        content: 'Mình thấy bạn có 2 story liên quan đến backend nè! Story "Fix lỗi database lúc demo" đã luyện 3 lần, coverage 85% — rất sẵn sàng rồi. Còn "Tự học deploy VPS" vẫn là bản nháp, chưa luyện lần nào. Mình khuyên bạn ôn lại story đầu tiên cho chắc, rồi hoàn thiện story VPS trước buổi phỏng vấn nhé!',
        intent: 'query',
        dataCards: {
            stories: [
                { id: 'mock-1', title: 'Fix lỗi database lúc demo', tags: ['backend', 'Node.js'], status: 'battle-tested', practice_count: 3, last_score: 85, framework: 'STAR' },
                { id: 'mock-4', title: 'Tự học deploy VPS từ con số 0', tags: ['DevOps', 'backend'], status: 'draft', practice_count: 0, last_score: null, framework: 'CAR' },
            ],
        },
        createdAt: '2026-04-20T08:01:10Z',
    },
    // --- QUERY intent: hỏi tiến trình ---
    {
        id: 'msg-3',
        role: 'user',
        content: 'Tuần này em tiến bộ chưa Ni?',
        createdAt: '2026-04-20T08:02:00Z',
    },
    {
        id: 'msg-4',
        role: 'mentor',
        content: 'Tuần này bạn luyện được 4 phiên, tăng 2 phiên so với tuần trước! Điểm trung bình 78/100, cải thiện 12 điểm. Streak hiện tại: 5 ngày liên tiếp — quá giỏi! 🔥 Điểm mạnh nhất là phần Nội dung (82/100), còn Cảm xúc/Ngữ điệu cần cải thiện thêm (71/100). Cứ giữ đà này nhé!',
        intent: 'query',
        dataCards: {
            progress: {
                sessionsThisWeek: 4,
                averageScore: 78,
                streak: 5,
                improvement: '+12',
                bestCategory: 'Nội dung',
                weakCategory: 'Cảm xúc',
            },
        },
        createdAt: '2026-04-20T08:02:10Z',
    },
    // --- ACTION intent: tạo story mới ---
    {
        id: 'msg-5',
        role: 'user',
        content: 'Tạo story mới đi Ni',
        createdAt: '2026-04-20T08:03:00Z',
    },
    {
        id: 'msg-6',
        role: 'mentor',
        content: 'OK! Bạn muốn kể về trải nghiệm gì nè? Cho mình biết sơ để mình chuẩn bị phòng Story Bank nhé. Ví dụ: một lần thuyết trình, giải quyết vấn đề kỹ thuật, hay làm việc nhóm?',
        intent: 'action',
        actionTaken: {
            type: 'navigate_story_bank',
            prefillData: null,
            label: '→ Tạo Story mới',
            href: '/stories/create',
        },
        createdAt: '2026-04-20T08:03:10Z',
    },
    // --- ACTION intent: vào phòng gym ---
    {
        id: 'msg-7',
        role: 'user',
        content: 'Luyện phỏng vấn đi',
        createdAt: '2026-04-20T08:04:00Z',
    },
    {
        id: 'msg-8',
        role: 'mentor',
        content: 'Có ngay! Mình gợi ý bối cảnh "Phỏng vấn Backend Developer" — phù hợp với 2 story backend của bạn. Nhớ ôn story "Fix lỗi database" trước khi vào nhé, coverage đang 85% rồi, cố lên 90%! 💪',
        intent: 'action',
        actionTaken: {
            type: 'navigate_gym',
            prefillData: { scenario: 'Phỏng vấn Backend Developer' },
            label: '→ Vào Phòng gym',
            href: '/setup?topic=Phỏng vấn Backend Developer',
        },
        dataCards: {
            stories: [
                { id: 'mock-1', title: 'Fix lỗi database lúc demo', tags: ['backend', 'Node.js'], status: 'battle-tested', practice_count: 3, last_score: 85, framework: 'STAR' },
            ],
        },
        createdAt: '2026-04-20T08:04:10Z',
    },
    // --- SUPPORT intent: tâm sự ---
    {
        id: 'msg-9',
        role: 'user',
        content: 'Em sợ nói trước lớp quá Ni ơi',
        createdAt: '2026-04-20T08:05:00Z',
    },
    {
        id: 'msg-10',
        role: 'mentor',
        content: 'Mình hiểu mà, cảm giác đó rất bình thường. Nhiều người giỏi cũng từng sợ nói trước đám đông lắm. Nhưng bạn biết không, bạn đã luyện 4 phiên tuần này rồi đó — mỗi phiên là một bước tiến. Mình nhớ story "Thuyết trình dự án AI" của bạn, lần đầu cũng run mà cuối cùng đạt giải Nhì cơ mà! 🌟\n\nMuốn thử challenge nhẹ nhàng không? Ví dụ: "Hỏi 1 câu trong giờ học ngày mai". Không cần hoàn hảo, chỉ cần thử thôi.',
        intent: 'support',
        dataCards: {
            challenges: [
                { id: 'ch-1', title: 'Hỏi 1 câu trong giờ học', difficulty: 1, deadline: '2026-04-22', status: 'pending' },
            ],
        },
        createdAt: '2026-04-20T08:05:15Z',
    },
    // --- QUERY intent: challenge ---
    {
        id: 'msg-11',
        role: 'user',
        content: 'Challenge tuần này là gì?',
        createdAt: '2026-04-20T08:06:00Z',
    },
    {
        id: 'msg-12',
        role: 'mentor',
        content: 'Bạn đang có 1 challenge pending: "Hỏi 1 câu phản biện cho giảng viên". Deadline: 22/04. Đây là challenge Lv1, phù hợp để bắt đầu. Muốn xem chi tiết hoặc báo cáo kết quả không?',
        intent: 'query',
        actionTaken: {
            type: 'navigate_challenge',
            prefillData: null,
            label: '→ Xem Challenge',
            href: '/achievements',
        },
        dataCards: {
            challenges: [
                { id: 'ch-2', title: 'Hỏi 1 câu phản biện cho giảng viên', difficulty: 1, deadline: '2026-04-22', status: 'pending' },
            ],
        },
        createdAt: '2026-04-20T08:06:10Z',
    },
];
