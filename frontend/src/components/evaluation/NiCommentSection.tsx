'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { apiClient } from '@/lib/apiClient'

interface Props {
    evalReport: any;
    storyCoverage?: any[];
    /** If provided, Ni will compare with previous score */
    previousScore?: number;
}

// Mock comment for demo mode
const MOCK_COMMENT = 'Phiên này bạn trình bày ý kiến rõ ràng hơn nhiều, đặc biệt phần mở đầu rất tự tin. Nhưng khi bị hỏi ngược thì vẫn hơi lúng túng — thử tập pause 2 giây trước khi trả lời xem sao nhé.'

export default function NiCommentSection({ evalReport, storyCoverage, previousScore }: Props) {
    const [comment, setComment] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!evalReport) return

        let cancelled = false

        async function fetchComment() {
            setLoading(true)
            try {
                const result = await apiClient.getEvalComment(evalReport, storyCoverage, undefined, previousScore)
                if (!cancelled) setComment(result)
            } catch {
                if (!cancelled) setComment(MOCK_COMMENT)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchComment()
        return () => { cancelled = true }
    }, [evalReport, storyCoverage, previousScore])

    return (
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                    <Image src="/ni-avatar.png" alt="Ni" width={44} height={44} className="object-cover" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 text-sm mb-2">Nhận xét từ Ni</h3>
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                            <Loader2 size={16} className="animate-spin text-teal-500" />
                            Ni đang đọc báo cáo...
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-xl rounded-tl-none p-4 border border-slate-100 text-[14px] text-slate-700 leading-relaxed">
                            {comment}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
