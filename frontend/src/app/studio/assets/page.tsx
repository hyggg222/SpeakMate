'use client';

import { ArrowLeft, Home, Upload, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';

const assetsToManage = [
    {
        id: 'mentor-ni',
        name: 'Mentor Ni (Avatar chính)',
        description: 'Ảnh chân dung Ni hiển thị ở Sidebar và Lời chào. File gốc: public/ni-avatar.png',
        targetPath: 'ni-avatar.png',
        currentUrl: '/ni-avatar.png',
        aspectRatio: 'aspect-[4/5]',
    },
    {
        id: 'tech-interview',
        name: 'Bối cảnh: Phỏng vấn Big Tech',
        description: 'Ảnh nền cho flashcard Phỏng vấn. File gốc: public/images/hot-scenarios/job_interview_tech.png',
        targetPath: 'images/hot-scenarios/job_interview_tech.png',
        currentUrl: '/images/hot-scenarios/job_interview_tech.png',
    },
    {
        id: 'london-cafe',
        name: 'Bối cảnh: Cafe tại London',
        description: 'Ảnh nền cho bối cảnh gọi đồ uống. File gốc: public/images/hot-scenarios/london_cafe_order.png',
        targetPath: 'images/hot-scenarios/london_cafe_order.png',
        currentUrl: '/images/hot-scenarios/london_cafe_order.png',
    },
    {
        id: 'airport-checkin',
        name: 'Bối cảnh: Check-in Sân bay',
        description: 'Ảnh nền bối cảnh du lịch. File gốc: public/images/hot-scenarios/airport_checkin_busy.png',
        targetPath: 'images/hot-scenarios/airport_checkin_busy.png',
        currentUrl: '/images/hot-scenarios/airport_checkin_busy.png',
    },
    {
        id: 'romantic-date',
        name: 'Bối cảnh: Hẹn hò lãng mạn',
        description: 'Ảnh nền bối cảnh giao tiếp. File gốc: public/images/hot-scenarios/fine_dining_date.png',
        targetPath: 'images/hot-scenarios/fine_dining_date.png',
        currentUrl: '/images/hot-scenarios/fine_dining_date.png',
    },
];

export default function AssetManagerPage() {
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [status, setStatus] = useState<{ id: string, type: 'success' | 'error', message: string } | null>(null);
    const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTarget, setActiveTarget] = useState<string | null>(null);

    const handleUpload = async (asset: typeof assetsToManage[0], file: File) => {
        try {
            setUploadingId(asset.id);
            setStatus(null);

            // Using the renamed endpoint we'll create in backend
            const result = await apiClient.uploadAsset(file, asset.targetPath);

            if (result.success) {
                const bustUrl = `${result.url}?t=${Date.now()}`;
                setPreviewUrls(prev => ({ ...prev, [asset.id]: bustUrl }));
                setStatus({ id: asset.id, type: 'success', message: 'Đã cập nhật asset thành công!' });
            }
        } catch (error) {
            console.error(error);
            setStatus({ id: asset.id, type: 'error', message: 'Lỗi khi tải ảnh lên codebase.' });
        } finally {
            setUploadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header */}
            <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-secondary rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-[18px] font-bold">Quản lý Tài nguyên Hệ thống</h1>
                    </div>
                    <div className="text-[12px] bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
                        🛠 Developer Mode
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 flex items-start gap-4">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <div className="text-[13px] text-amber-500/90 leading-relaxed">
                        <p className="font-bold mb-1">Cảnh báo Developer:</p>
                        Việc tải ảnh lên ở đây sẽ <strong>ghi đè trực tiếp</strong> vào thư mục <code>public/</code> trong codebase của bạn.
                        Thay đổi này là vĩnh viễn và ảnh hưởng đến tất cả người dùng.
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {assetsToManage.map((asset) => (
                        <div
                            key={asset.id}
                            className="bg-card border rounded-2xl p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow"
                        >
                            {/* Preview */}
                            <div className={`relative ${asset.aspectRatio || 'aspect-video'} w-full md:w-64 rounded-xl overflow-hidden bg-secondary border shadow-inner`}>
                                <Image
                                    src={previewUrls[asset.id] || asset.currentUrl}
                                    alt={asset.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>

                            {/* Details & Actions */}
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <h2 className="text-[17px] font-bold mb-1">{asset.name}</h2>
                                    <p className="text-[13px] text-muted-foreground mb-4">
                                        {asset.description}
                                    </p>

                                    {status?.id === asset.id && (
                                        <div className={`flex items-center gap-2 text-[12px] font-medium p-2 rounded-lg mb-4 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                                            {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                            {status.message}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setActiveTarget(asset.id);
                                            fileInputRef.current?.click();
                                        }}
                                        disabled={uploadingId === asset.id}
                                        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                    >
                                        {uploadingId === asset.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Upload size={16} />
                                        )}
                                        {uploadingId === asset.id ? 'Đang cập nhật...' : 'Tải ảnh mới lên'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Hidden Input for generic use */}
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        const asset = assetsToManage.find(a => a.id === activeTarget);
                        if (file && asset) handleUpload(asset, file);
                        e.target.value = ''; // Reset
                    }}
                />
            </main>
        </div>
    );
}
