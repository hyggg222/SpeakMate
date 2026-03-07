'use client'

import { useState } from 'react'
import { X, Target, Clock, UploadCloud, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/apiClient'

interface ChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
}

export default function ChallengeModal({ isOpen, onClose, sessionId }: ChallengeModalProps) {
    const [loading, setLoading] = useState(false);
    const [challengeData, setChallengeData] = useState<any>(null);
    const [deadline, setDeadline] = useState("1"); // days
    const [accepting, setAccepting] = useState(false);

    // Fetch challenge dynamically on open
    const generateChallenge = async () => {
        setLoading(true);
        try {
            const data = await apiClient.generateChallenge(sessionId);
            setChallengeData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    if (isOpen && !challengeData && !loading) {
        generateChallenge();
    }

    const handleAccept = async () => {
        if (!challengeData) return;
        setAccepting(true);
        try {
            // ISO Date matching deadline selection
            const d = new Date();
            d.setDate(d.getDate() + parseInt(deadline));
            await apiClient.setChallengeDeadline(challengeData.id, d.toISOString());
            alert("Thử thách đã được nhận! Hãy hoàn thành đúng hạn nhé.");
            onClose();
        } catch (error) {
            console.error("Lỗi khi set deadline:", error);
        } finally {
            setAccepting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden relative"
            >
                {/* Header Graphic */}
                <div className="h-32 bg-gradient-to-br from-amber-400 to-amber-600 p-6 flex flex-col justify-end text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-black/20 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <Target className="w-10 h-10 mb-2 opacity-90" />
                    <h2 className="text-2xl font-bold font-serif leading-tight">Thử Thách Thực Tế</h2>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                            <p>Ni đang phân tích điểm yếu và tạo thử thách cho bạn...</p>
                        </div>
                    ) : challengeData ? (
                        <div className="flex flex-col gap-6">
                            <div>
                                <h3 className="text-[17px] font-bold text-slate-800 mb-2">{challengeData.title}</h3>
                                <p className="text-[14px] text-slate-600 leading-relaxed bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    {challengeData.description}
                                </p>
                            </div>

                            {challengeData.opener_hints && challengeData.opener_hints.length > 0 && (
                                <div>
                                    <h4 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">💡 Gợi ý diễn đạt</h4>
                                    <div className="flex flex-col gap-2">
                                        {challengeData.opener_hints.map((hint: string, i: number) => (
                                            <div key={i} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 font-medium">
                                                "{hint}"
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                                <label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" /> Chọn hạn chót (Deadline)
                                </label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[14px] text-slate-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                >
                                    <option value="1">Trong vòng 24 giờ</option>
                                    <option value="3">Trong 3 ngày tới</option>
                                    <option value="7">Trong tuần này</option>
                                </select>
                            </div>

                            <button
                                onClick={handleAccept}
                                disabled={accepting}
                                className="w-full bg-[#0b1325] hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                            >
                                {accepting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                                CHẤP NHẬN THỬ THÁCH
                            </button>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-rose-500">
                            Đã xảy ra lỗi khi tạo thử thách.
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
