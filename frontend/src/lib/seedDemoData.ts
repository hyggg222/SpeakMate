/**
 * Seeds localStorage with demo historical data for guest users.
 * Called once on first load — skipped if data already exists.
 */
export function seedDemoDataIfNeeded() {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('speakmate_demo_seeded')) return;

    // 5 lượt realworld trước (để FeedbackResults hiện mũi tên so sánh)
    const realworldHistory = [
        { coherence_score: 52, jargon_count: 5, filler_per_minute: 12.5, fluency_score: 58, emotion_trend: 'unknown', created_at: daysAgo(28) },
        { coherence_score: 61, jargon_count: 4, filler_per_minute: 9.8,  fluency_score: 63, emotion_trend: 'improved', created_at: daysAgo(21) },
        { coherence_score: 68, jargon_count: 3, filler_per_minute: 7.2,  fluency_score: 71, emotion_trend: 'improved', created_at: daysAgo(14) },
        { coherence_score: 74, jargon_count: 2, filler_per_minute: 5.1,  fluency_score: 78, emotion_trend: 'improved', created_at: daysAgo(7) },
        { coherence_score: 79, jargon_count: 1, filler_per_minute: 3.8,  fluency_score: 83, emotion_trend: 'improved', created_at: daysAgo(3) },
    ];

    // 5 phiên gym (cho tab Phòng ảo trong /progress)
    const gymHistory = [
        { coherence_score: 48, jargon_count: 7, filler_per_minute: 14.2, avg_response_time: 5.8, created_at: daysAgo(30) },
        { coherence_score: 55, jargon_count: 6, filler_per_minute: 11.0, avg_response_time: 4.9, created_at: daysAgo(22) },
        { coherence_score: 63, jargon_count: 4, filler_per_minute: 8.5,  avg_response_time: 4.1, created_at: daysAgo(15) },
        { coherence_score: 71, jargon_count: 3, filler_per_minute: 6.2,  avg_response_time: 3.5, created_at: daysAgo(8) },
        { coherence_score: 76, jargon_count: 2, filler_per_minute: 4.8,  avg_response_time: 2.9, created_at: daysAgo(2) },
    ];

    localStorage.setItem('speakmate_realworld_history', JSON.stringify(realworldHistory));
    localStorage.setItem('speakmate_gym_history', JSON.stringify(gymHistory));
    localStorage.setItem('speakmate_demo_seeded', '1');
}

function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

/**
 * Compute average of 5 previous realworld metrics for comparison arrows.
 */
export function getPreviousRealworldMetrics() {
    if (typeof window === 'undefined') return null;
    try {
        const stored = JSON.parse(localStorage.getItem('speakmate_realworld_history') || '[]');
        if (stored.length === 0) return null;
        const last5 = stored.slice(-5);
        return {
            coherenceScore: Math.round(last5.reduce((s: number, r: any) => s + (r.coherence_score || 0), 0) / last5.length),
            jargonCount: Math.round(last5.reduce((s: number, r: any) => s + (r.jargon_count || 0), 0) / last5.length),
            fillerPerMinute: parseFloat((last5.reduce((s: number, r: any) => s + (r.filler_per_minute || 0), 0) / last5.length).toFixed(1)),
            fluencyScore: Math.round(last5.reduce((s: number, r: any) => s + (r.fluency_score || 0), 0) / last5.length),
            jargonList: [], fillerCount: 0, fillerList: [], fluencyNote: '',
        };
    } catch { return null; }
}

export function getLocalProgressDetail() {
    if (typeof window === 'undefined') return null;
    try {
        const gym = JSON.parse(localStorage.getItem('speakmate_gym_history') || '[]');
        const rw  = JSON.parse(localStorage.getItem('speakmate_realworld_history') || '[]');
        return {
            gymHistory: gym.map((s: any, i: number) => ({ ...s, name: `#${i + 1}` })),
            realworldHistory: rw.map((s: any, i: number) => ({ ...s, name: `#${i + 1}` })),
        };
    } catch { return null; }
}
