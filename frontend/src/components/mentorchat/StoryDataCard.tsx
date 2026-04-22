'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { STATUS_LABELS, FRAMEWORK_COLORS } from '@/lib/storybank-constants';

interface Props {
    story: {
        id: string;
        title: string;
        tags?: string[];
        status: string;
        framework: string;
        practice_count?: number;
        last_score?: number | null;
    };
}

export default function StoryDataCard({ story }: Props) {
    const statusInfo = STATUS_LABELS[story.status] || STATUS_LABELS.draft;
    const frameworkColor = FRAMEWORK_COLORS[story.framework] || '#6b7280';

    return (
        <Link href={`/stories/${story.id}`}>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[var(--teal)] hover:shadow-sm transition-all cursor-pointer mt-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{story.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: frameworkColor }}>
                            {story.framework}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}>
                            {statusInfo.label}
                        </span>
                        {story.practice_count != null && story.practice_count > 0 && (
                            <span className="text-[10px] text-slate-400">{story.practice_count}x{story.last_score != null && ` | ${story.last_score}%`}</span>
                        )}
                    </div>
                </div>
                {(story.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 max-w-[120px]">
                        {story.tags!.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
}
