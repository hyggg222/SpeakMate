'use client';

import { Target, Calendar } from 'lucide-react';

interface Props {
    challenge: {
        id: string;
        title: string;
        difficulty: number;
        deadline?: string;
        status: string;
    };
}

const DIFFICULTY_LABELS = ['', 'Lv1 — Nhẹ', 'Lv2 — Vừa', 'Lv3 — Thử thách', 'Lv4 — Khó', 'Lv5 — Cực khó'];
const DIFFICULTY_COLORS = ['', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#991b1b'];

export default function ChallengeDataCard({ challenge }: Props) {
    const diffLabel = DIFFICULTY_LABELS[challenge.difficulty] || `Lv${challenge.difficulty}`;
    const diffColor = DIFFICULTY_COLORS[challenge.difficulty] || '#6b7280';

    return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white mt-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${diffColor}15` }}>
                <Target size={16} style={{ color: diffColor }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{challenge.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-medium" style={{ color: diffColor }}>{diffLabel}</span>
                    {challenge.deadline && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <Calendar size={9} /> {new Date(challenge.deadline).toLocaleDateString('vi-VN')}
                        </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${challenge.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {challenge.status === 'pending' ? 'Đang chờ' : challenge.status}
                    </span>
                </div>
            </div>
        </div>
    );
}
