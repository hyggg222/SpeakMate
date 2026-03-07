'use client'

import { useEffect, useState } from 'react'
import { Target, Clock, Mic, Square, Loader2, UploadCloud, CheckCircle2 } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

export default function ActiveChallenges() {
    const [challenges, setChallenges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();

    const [reportingId, setReportingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        setLoading(true);
        try {
            const data = await apiClient.getUserChallenges();
            // Lọc ra các challenge đang active (pending)
            const active = data.filter(c => c.status === 'pending');
            setChallenges(active);
        } catch (error) {
            console.error('Lỗi khi fetch challenges:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartRecord = (id: string) => {
        setReportingId(id);
        setAnalysisResult(null);
        startRecording();
    };

    const handleStopRecord = async () => {
        const audioBlob = await stopRecording();
        if (!audioBlob || !reportingId) return;

        setIsUploading(true);
        try {
            const res = await apiClient.reportChallenge(reportingId, audioBlob);
            setAnalysisResult(res);
            // Refresh list
            fetchChallenges();
        } catch (error) {
            console.error('Lỗi upload báo cáo:', error);
            alert("Báo cáo thất bại, thử lại sau!");
        } finally {
            setIsUploading(false);
            setReportingId(null);
        }
    };

    if (loading && challenges.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 flex justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        );
    }

    if (challenges.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 border-dashed text-center text-slate-500 shadow-sm flex flex-col items-center">
                <div className="bg-slate-50 p-3 rounded-full mb-3">
                    <Target className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="font-bold text-slate-700 text-[14px]">Chưa có thử thách</h4>
                <p className="text-[12px] mt-1 leading-relaxed text-slate-500">
                    Hãy hoàn thành một buổi luyện tập để Ni giao phó bài tập thực tế (Gamification Loop) cho bạn nha!
                </p>
            </div>
        );
    }

    // Only show top 1 active
    const challenge = challenges[0];

    const getDaysLeft = (deadline: string) => {
        const diff = new Date(deadline).getTime() - new Date().getTime();
        return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
    };

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200/50 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
                <Target className="w-24 h-24 text-amber-600" />
            </div>

            <div className="flex items-center gap-2 mb-3">
                <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg border border-amber-200">
                    <Target className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm tracking-tight">Thử thách của bạn</h3>
            </div>

            <div className="flex flex-col gap-3 relative z-10">
                <div>
                    <h4 className="font-bold text-slate-800 text-[15px] leading-tight">{challenge.title}</h4>
                    <p className="text-[13px] text-slate-600 mt-1 line-clamp-2">{challenge.description}</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-rose-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Hạn chót: Còn {getDaysLeft(challenge.deadline)} ngày</span>
                </div>

                {isUploading ? (
                    <div className="w-full bg-white rounded-xl py-3 flex items-center justify-center gap-2 text-amber-600 font-bold border border-amber-200">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang phân tích báo cáo...
                    </div>
                ) : analysisResult ? (
                    <div className="w-full bg-emerald-50 rounded-xl p-3 border border-emerald-200 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                            <CheckCircle2 className="w-4 h-4" /> Hoàn thành!
                        </div>
                        <p className="text-[12px] text-slate-600">{analysisResult.comment}</p>
                        <div className="text-[12px] font-bold text-emerald-700">+{analysisResult.xpAwarded} XP</div>
                    </div>
                ) : isRecording && reportingId === challenge.id ? (
                    <button
                        onClick={handleStopRecord}
                        className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-xl py-3 font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                        <Square className="w-4 h-4 fill-white animate-pulse" />
                        Gửi Báo Cáo
                    </button>
                ) : (
                    <button
                        onClick={() => handleStartRecord(challenge.id)}
                        className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl py-3 font-bold text-sm shadow cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                        <Mic className="w-4 h-4" />
                        Ghi âm Báo Cáo
                    </button>
                )}
            </div>
        </div>
    )
}
