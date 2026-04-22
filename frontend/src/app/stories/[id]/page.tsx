'use client';

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import Link from "next/link";
import { ArrowLeft, Clock, Edit3, Trash2, Loader2, Save, X, Check, Volume2, VolumeX, Dumbbell } from "lucide-react";
import { STATUS_LABELS, FRAMEWORK_COLORS, STRUCTURED_FIELDS } from "@/lib/storybank-constants";

export default function StoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const storyId = params.id as string;

    const [story, setStory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // TTS state
    const [isSpeaking, setIsSpeaking] = useState(false);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Editable fields
    const [editTitle, setEditTitle] = useState("");
    const [editStructured, setEditStructured] = useState<any>(null);
    const [editFullScript, setEditFullScript] = useState("");
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editStatus, setEditStatus] = useState("");
    const [newTag, setNewTag] = useState("");

    // Track unsaved changes
    const [hasChanges, setHasChanges] = useState(false);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const fetchStory = async () => {
            try {
                const data = await apiClient.getStory(storyId);
                if (!data) { router.push('/stories'); return; }
                setStory(data);
            } catch { router.push('/stories'); }
            finally { setLoading(false); }
        };
        fetchStory();
    }, [storyId, router]);

    // Warn on unsaved changes
    useEffect(() => {
        if (!editing || !hasChanges) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [editing, hasChanges]);

    const startEditing = () => {
        setEditTitle(story.title);
        setEditStructured({ ...story.structured });
        setEditFullScript(story.full_script);
        setEditTags([...(story.tags || [])]);
        setEditStatus(story.status);
        setEditing(true);
        setHasChanges(false);
    };

    const cancelEditing = () => {
        if (hasChanges && !confirm("Bạn có thay đổi chưa lưu. Hủy chỉnh sửa?")) return;
        setEditing(false);
        setHasChanges(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await apiClient.updateStory(storyId, {
                title: editTitle,
                structured: editStructured,
                fullScript: editFullScript,
                tags: editTags,
                status: editStatus,
            });
            setStory(updated);
            setEditing(false);
            setHasChanges(false);
            showToast("Đã lưu thay đổi!", "success");
        } catch {
            showToast("Không thể lưu. Vui lòng thử lại.", "error");
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await apiClient.deleteStory(storyId);
            router.push('/stories');
        } catch {
            showToast("Không thể xóa.", "error");
            setDeleting(false);
        }
    };

    const addTag = () => {
        const trimmed = newTag.trim();
        if (trimmed && !editTags.includes(trimmed) && editTags.length < 10 && trimmed.length <= 30) {
            setEditTags([...editTags, trimmed]);
            setNewTag("");
            setHasChanges(true);
        }
    };

    // TTS
    const toggleTTS = () => {
        if (isSpeaking) {
            speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }
        const text = story?.full_script;
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        synthRef.current = utterance;
        speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    // Cleanup TTS on unmount
    useEffect(() => { return () => { speechSynthesis.cancel(); }; }, []);

    if (loading) {
        return (
            <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
                <Sidebar />
                <main className="flex flex-col flex-1 overflow-hidden">
                    <Topbar />
                    <section className="flex-1 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-slate-400" />
                    </section>
                </main>
            </div>
        );
    }

    if (!story) return null;

    const statusInfo = STATUS_LABELS[story.status] || STATUS_LABELS.draft;
    const frameworkColor = FRAMEWORK_COLORS[story.framework] || "#6b7280";
    const structured = story.structured || {};
    const fields = STRUCTURED_FIELDS[story.framework] || STRUCTURED_FIELDS.STAR;

    return (
        <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
            <Sidebar />
            <main className="flex flex-col flex-1 overflow-hidden">
                <Topbar />
                <section className="flex-1 overflow-y-auto px-[5%] xl:px-[12%] py-10 bg-[#f8fafc]">
                    <div className="max-w-5xl mx-auto space-y-6">

                        <Link href="/stories" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                            <ArrowLeft size={16} /> Quay lại Kho Chuyện
                        </Link>

                        {/* Header Card */}
                        <div className="bg-white border rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    {editing ? (
                                        <input type="text" value={editTitle}
                                            onChange={e => { setEditTitle(e.target.value); setHasChanges(true); }}
                                            className="text-2xl font-bold font-serif w-full border-b-2 border-[var(--teal)] pb-1 outline-none" maxLength={200} />
                                    ) : (
                                        <h1 className="text-2xl font-bold font-serif text-slate-900">{story.title}</h1>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-md text-white" style={{ backgroundColor: frameworkColor }}>{story.framework}</span>
                                    {editing ? (
                                        <select value={editStatus} onChange={e => { setEditStatus(e.target.value); setHasChanges(true); }}
                                            className="text-xs border rounded-lg px-2 py-1 outline-none">
                                            <option value="draft">Bản nháp</option>
                                            <option value="ready">Sẵn sàng</option>
                                            <option value="battle-tested">Thực chiến</option>
                                        </select>
                                    ) : (
                                        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                                            style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}>
                                            {statusInfo.label}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {editing ? (
                                    <>
                                        {editTags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                                                {tag}
                                                <button onClick={() => { setEditTags(editTags.filter(t => t !== tag)); setHasChanges(true); }} className="hover:text-red-500"><X size={12} /></button>
                                            </span>
                                        ))}
                                        {editTags.length < 10 && (
                                            <input type="text" value={newTag}
                                                onChange={e => setNewTag(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                                placeholder="+ Tag" maxLength={30}
                                                className="border rounded-lg px-2 py-1 text-xs outline-none w-24" />
                                        )}
                                    </>
                                ) : (
                                    (story.tags || []).map((tag: string) => (
                                        <span key={tag} className="text-sm px-3 py-1 rounded-full bg-slate-100 text-slate-600">{tag}</span>
                                    ))
                                )}
                            </div>

                            {/* Meta */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                                <span className="flex items-center gap-1"><Clock size={12} /> ~{story.estimated_duration || 30}s</span>
                                {story.practice_count > 0 && <span>{story.practice_count}x luyện tập</span>}
                                {story.last_score != null && <span>Điểm: {story.last_score}%</span>}
                                <span>Tạo: {new Date(story.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 mt-5 pt-4 border-t">
                                {editing ? (
                                    <>
                                        <button onClick={handleSave} disabled={saving}
                                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                                            style={{ backgroundColor: "var(--teal)" }}>
                                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu thay đổi
                                        </button>
                                        <button onClick={cancelEditing} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">Hủy</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={startEditing} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium border hover:bg-slate-50 transition-colors">
                                            <Edit3 size={14} /> Chỉnh sửa
                                        </button>
                                        <Link href={`/setup?topic=${encodeURIComponent(story.title)}`}
                                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                                            style={{ backgroundColor: "var(--teal)" }}>
                                            <Dumbbell size={14} /> Luyện tập ngay
                                        </Link>
                                        <button onClick={() => setShowDeleteConfirm(true)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors ml-auto">
                                            <Trash2 size={14} /> Xóa
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Structure */}
                        <div className="bg-white border rounded-2xl p-6 space-y-4">
                            <h2 className="font-semibold text-slate-800">Cấu trúc {story.framework}</h2>
                            {fields.map(({ key, label, emoji }: { key: string; label: string; emoji: string }) => (
                                <div key={key} className="border-l-4 pl-4 py-2" style={{ borderColor: frameworkColor }}>
                                    <p className="text-xs font-medium text-slate-400 mb-1">{emoji} {label}</p>
                                    {editing ? (
                                        <textarea value={editStructured?.[key] || ""}
                                            onChange={e => { setEditStructured({ ...editStructured, [key]: e.target.value }); setHasChanges(true); }}
                                            rows={2} className="w-full border rounded-lg px-3 py-2 text-sm outline-none resize-y focus:ring-2 focus:ring-[var(--teal)]/30" />
                                    ) : (
                                        <p className="text-sm text-slate-700 leading-relaxed">{structured[key] || "—"}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Full Script */}
                        <div className="bg-white border rounded-2xl p-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-slate-800">Đoạn nói hoàn chỉnh</h2>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400">~{story.estimated_duration || 30}s</span>
                                    <button onClick={toggleTTS} title={isSpeaking ? "Dừng" : "Nghe thử"}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${isSpeaking ? 'bg-red-50 border-red-300 text-red-500' : 'border-slate-200 text-slate-500 hover:text-[var(--teal)] hover:border-[var(--teal)]'}`}>
                                        {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                                        {isSpeaking ? 'Dừng' : 'Nghe'}
                                    </button>
                                </div>
                            </div>
                            {editing ? (
                                <textarea value={editFullScript}
                                    onChange={e => { setEditFullScript(e.target.value); setHasChanges(true); }}
                                    rows={6} className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-y focus:ring-2 focus:ring-[var(--teal)]/30 leading-relaxed" />
                            ) : (
                                <div className="bg-slate-50 rounded-xl px-5 py-4 text-sm text-slate-700 leading-relaxed italic">
                                    &ldquo;{story.full_script}&rdquo;
                                </div>
                            )}
                        </div>

                        {/* Practice History Timeline */}
                        {story.practiceHistory && story.practiceHistory.length > 0 && (
                            <div className="bg-white border rounded-2xl p-6">
                                <h2 className="font-semibold text-slate-800 mb-4">Lịch sử luyện tập</h2>
                                <div className="relative pl-6 space-y-6">
                                    {/* Timeline line */}
                                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-200" />

                                    {story.practiceHistory.map((h: any, i: number) => (
                                        <div key={h.id} className="relative">
                                            {/* Dot */}
                                            <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 ${
                                                i === 0 ? 'border-[var(--teal)] bg-teal-50' : 'border-slate-300 bg-white'
                                            }`} />

                                            <div className="border rounded-xl px-4 py-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold" style={{
                                                            color: h.coverage_score >= 70 ? '#10b981' : h.coverage_score >= 40 ? '#f59e0b' : '#ef4444'
                                                        }}>
                                                            {h.coverage_score}%
                                                        </span>
                                                        <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{
                                                                width: `${h.coverage_score}%`,
                                                                backgroundColor: h.coverage_score >= 70 ? '#10b981' : h.coverage_score >= 40 ? '#f59e0b' : '#ef4444'
                                                            }} />
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-slate-400">{new Date(h.created_at).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                {h.feedback && <p className="text-xs text-slate-500">{h.feedback}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
                    toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                    {toast.message}
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
                        <h3 className="text-lg font-semibold text-slate-900">Xóa câu chuyện?</h3>
                        <p className="text-sm text-slate-600">
                            Bạn có chắc muốn xóa &ldquo;{story.title}&rdquo;? Hành động này không thể hoàn tác.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <button onClick={handleDelete} disabled={deleting}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-medium bg-red-500 disabled:opacity-50">
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Xóa
                            </button>
                            <button onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">Hủy</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
