import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

interface SuggestedStory {
    id: string;
    title: string;
    tags: string[];
    framework: string;
    status: string;
    full_script: string;
    estimated_duration: number;
    structured: any;
    overlapCount: number;
}

/**
 * Strips Vietnamese diacritics for fuzzy tag matching.
 * "Phỏng vấn" → "phong van", "kỹ thuật" → "ky thuat"
 */
function removeDiacritics(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
}

/**
 * Client-side tag matching hook for pre-gym Story Bank suggestions.
 * Fetches user's stories once, then filters by tag intersection with scenario's relevantTags.
 * Uses diacritics-free matching so "phỏng vấn" matches "phong van".
 * Performance: instant (< 100ms) — no AI call, pure client-side filtering.
 */
export function useStoryBankSuggestions(relevantTags: string[] | undefined) {
    const [suggestions, setSuggestions] = useState<SuggestedStory[]>([]);
    const [allStories, setAllStories] = useState<SuggestedStory[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!relevantTags || relevantTags.length === 0) return;

        let cancelled = false;

        async function fetchAndMatch() {
            setLoading(true);
            try {
                const result = await apiClient.listStories({ limit: 50 });
                if (cancelled) return;

                const stories = result.data || [];

                // Store all stories for browse view
                setAllStories(stories.map((s: any) => ({ ...s, overlapCount: 0 })));

                if (stories.length === 0) {
                    setSuggestions([]);
                    return;
                }

                // Normalize tags: remove diacritics for fuzzy matching
                const scenarioTags = relevantTags!.map(removeDiacritics);

                // Score each story by tag overlap
                const scored: SuggestedStory[] = stories
                    .map((story: any) => {
                        const storyTags = (story.tags || []).map(removeDiacritics);
                        let overlapCount = 0;
                        for (const st of scenarioTags) {
                            for (const ut of storyTags) {
                                // Partial match: "phong van" matches "phong van xin viec"
                                if (ut.includes(st) || st.includes(ut)) {
                                    overlapCount++;
                                    break;
                                }
                            }
                        }
                        return { ...story, overlapCount };
                    })
                    .filter((s: SuggestedStory) => s.overlapCount > 0)
                    .sort((a: SuggestedStory, b: SuggestedStory) => {
                        // Sort by overlap count desc, then by status priority (ready > battle-tested > draft)
                        if (b.overlapCount !== a.overlapCount) return b.overlapCount - a.overlapCount;
                        const statusPriority: Record<string, number> = { ready: 3, 'battle-tested': 2, draft: 1 };
                        return (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
                    })
                    .slice(0, 5);

                setSuggestions(scored);
            } catch (err) {
                console.error('[useStoryBankSuggestions] Failed:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchAndMatch();
        return () => { cancelled = true; };
    }, [relevantTags]);

    const hasStories = allStories.length > 0;
    return { suggestions, loading, allStories, hasStories };
}
