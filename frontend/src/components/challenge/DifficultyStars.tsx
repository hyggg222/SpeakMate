'use client'

import { Star } from 'lucide-react'

interface DifficultyStarsProps {
    level: number; // 1-5
    size?: number;
}

export default function DifficultyStars({ level, size = 14 }: DifficultyStarsProps) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star
                    key={i}
                    size={size}
                    className={i <= level
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300'
                    }
                />
            ))}
        </div>
    )
}
