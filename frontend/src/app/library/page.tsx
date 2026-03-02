"use client";

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { Search, Clock, Layers } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LibraryPage() {
    const scripts = [
        {
            mode: "Tranh biện", modeColor: "badge-orange", title: "Kịch bản tranh biện: Học sinh nên tự chọn nghề", desc: "Bao gồm: mở bài, 2 luận điểm chính và kết bài. Gợi ý câu nối giữa các ý.", time: "3-5 phút", parts: "3 phần chính", details: [
                { title: "Mở bài", desc: "Giới thiệu chủ đề và quan điểm." },
                { title: "Thân bài", desc: "Triển khai 2 luận điểm chính có dẫn chứng." },
                { title: "Kết bài", desc: "Khẳng định lại vấn đề." }
            ]
        },
        {
            mode: "Giao tiếp cơ bản", modeColor: "badge-green", title: "Kịch bản luyện nói 3 phút: Giới thiệu bản thân", desc: "Cấu trúc đơn giản cho bài giới thiệu ngắn gọn, tạo điểm nhấn nhẹ nhàng.", time: "2-3 phút", parts: "3 phần chính", details: [
                { title: "Mở đoạn", desc: "Chào hỏi và giới thiệu tên tuổi." },
                { title: "Thân đoạn", desc: "Nói về sở thích, công việc hiện tại." },
                { title: "Kết đoạn", desc: "Mong muốn học hỏi và giao lưu." }
            ]
        },
        {
            mode: "Giao tiếp", modeColor: "badge-blue", title: "Kịch bản giao tiếp: Đàm phán lương", desc: "Các bước đàm phán mức thu nhập mong muốn với nhà tuyển dụng.", time: "4-6 phút", parts: "4 phần chính", details: [
                { title: "Chuẩn bị", desc: "Nghiên cứu thị trường và xác định mức lương." },
                { title: "Mở đầu", desc: "Khẳng định giá trị bản thân." },
                { title: "Đàm phán", desc: "Thương lượng cứng rắn nhưng khéo léo." },
                { title: "Kết thúc", desc: "Chốt vấn đề vui vẻ." }
            ]
        },
        {
            mode: "Tranh biện", modeColor: "badge-orange", title: "Kịch bản tranh biện: Làm việc từ xa hiệu quả hơn", desc: "So sánh ưu nhược điểm của mô hình làm việc hiện đại.", time: "3-5 phút", parts: "3 phần chính", details: [
                { title: "Mở bài", desc: "Nêu xu hướng làm việc từ xa." },
                { title: "Thân bài", desc: "Những lợi ích vượt trội về thời gian, chi phí." },
                { title: "Kết bài", desc: "Gắn kết đội ngũ bằng phần mềm." }
            ]
        },
        {
            mode: "Giao tiếp cơ bản", modeColor: "badge-green", title: "Giao tiếp cơ bản: Lời mời tham gia khóa học", desc: "Cấu trúc thân thiện, thuyết phục nhẹ nhàng người thân tham gia.", time: "5-8 phút", parts: "4 phần chính", details: [
                { title: "Mở đoạn", desc: "Chào hỏi vui vẻ và hỏi thăm sức khỏe." },
                { title: "Thân đoạn 1", desc: "Giới thiệu về khóa học, tại sao lại nghĩ là phù hợp với đối phương." },
                { title: "Thân đoạn 2", desc: "Nhấn mạnh những lợi ích nó mang lại (không cưỡng ép)." },
                { title: "Kết đoạn", desc: "Mời gọi nhẹ nhàng, để đối phương có thời gian suy nghĩ." }
            ]
        },
        {
            mode: "Giao tiếp", modeColor: "badge-blue", title: "Kịch bản giao tiếp: Giải quyết xung đột nhóm", desc: "Các bước hòa giải và xây dựng lại sự tin tưởng.", time: "3-5 phút", parts: "3 phần chính", details: [
                { title: "Lắng nghe", desc: "Tạo không gian để hai bên giãi bày." },
                { title: "Giải quyết", desc: "Tìm ra điểm chung và thống nhất." },
                { title: "Hòa giải", desc: "Xóa bỏ khúc mắc, tập trung vào mục tiêu chung." }
            ]
        },
    ];

    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState('Tất cả');
    const [filterLength, setFilterLength] = useState('Tất cả');
    const [selectedScript, setSelectedScript] = useState(scripts[1]); // Giao tiếp cơ bản by default

    const filteredScripts = scripts.filter(s => {
        if (filterMode !== 'Tất cả' && s.mode !== filterMode) return false;
        if (filterLength !== 'Tất cả') {
            if (filterLength === 'Ngắn' && !s.time.includes('2-3')) return false;
            if (filterLength === 'Vừa' && !s.time.includes('3-5') && !s.time.includes('4-6')) return false;
            if (filterLength === 'Dài' && !s.time.includes('5-8')) return false;
        }
        if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const getModeColorStr = (mode: string) => {
        if (mode === 'Giao tiếp cơ bản') return '#10b981';
        if (mode === 'Giao tiếp') return '#3b82f6';
        if (mode === 'Tranh biện') return '#f59e0b';
        return '#94a3b8';
    };

    const getBadgeStyle = (mode: string) => {
        return {
            backgroundColor: getModeColorStr(mode),
            color: "white"
        };
    };

    return (
        <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
            <Sidebar />

            <main className="flex flex-col flex-1 overflow-hidden bg-[#f8fafc]">
                <Topbar variant="light" />

                <section className="flex-1 overflow-y-auto px-[5%] xl:px-[10%] py-10">
                    <div className="max-w-7xl mx-auto">

                        {/* Header */}
                        <h1 className="text-4xl font-bold font-serif mb-8 text-slate-900">
                            Thư viện
                        </h1>

                        {/* Tabs */}
                        <div className="flex items-center gap-8 border-b border-slate-200 mb-8">
                            <button className="pb-4 text-[15px] font-medium text-slate-500 hover:text-slate-800 transition-colors">Đề bài & Chủ đề</button>
                            <button className="pb-4 text-[15px] font-medium text-slate-500 hover:text-slate-800 transition-colors">Tài liệu của tôi</button>
                            <button className="pb-4 text-[15px] font-bold text-slate-900 border-b-2 border-slate-900">Mẫu kịch bản</button>
                        </div>

                        {/* Main Grid: Left Content (Filters + Cards) & Right Panel (Quick View) */}
                        <div className="flex flex-col lg:flex-row gap-8 items-start">

                            {/* Left Content */}
                            <div className="flex-1 space-y-6 w-full lg:w-auto">

                                {/* Filters */}
                                <div className="flex flex-wrap items-center gap-4 bg-[#f8fafc] pb-2">
                                    <div className="relative flex-1 min-w-[250px] max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Tìm mẫu kịch bản..."
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[var(--teal)] transition-colors shadow-sm bg-white"
                                        />
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-medium text-slate-500 px-1 mb-0.5">Chế độ</span>
                                        <select
                                            value={filterMode}
                                            onChange={(e) => setFilterMode(e.target.value)}
                                            className="border-none bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer pr-4 appearance-none custom-select"
                                        >
                                            <option>Tất cả</option>
                                            <option>Giao tiếp cơ bản</option>
                                            <option>Giao tiếp</option>
                                            <option>Tranh biện</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-medium text-slate-500 px-1 mb-0.5">Độ dài</span>
                                        <select
                                            value={filterLength}
                                            onChange={(e) => setFilterLength(e.target.value)}
                                            className="border-none bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer pr-4 appearance-none custom-select"
                                        >
                                            <option>Tất cả</option>
                                            <option>Ngắn</option>
                                            <option>Vừa</option>
                                            <option>Dài</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Script Cards Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {filteredScripts.length === 0 && (
                                        <div className="col-span-2 text-center text-slate-500 py-10">Không tìm thấy mẫu kịch bản phù hợp.</div>
                                    )}
                                    {filteredScripts.map((script, i) => {
                                        const isDisabled = script.mode !== "Giao tiếp cơ bản";
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => setSelectedScript(script)}
                                                className={`bg-white rounded-2xl p-5 border cursor-pointer border-slate-200 shadow-sm flex flex-col h-full ${isDisabled ? 'opacity-80 grayscale-[20%]' : 'hover:border-[var(--teal)] hover:shadow-md transition-all'} ${selectedScript.title === script.title ? 'border-[var(--teal)] shadow-md ring-2 ring-teal-100' : ''}`}
                                            >
                                                <div className="mb-3">
                                                    <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-3 shadow-sm border border-slate-100" style={getBadgeStyle(script.mode)}>
                                                        {script.mode}
                                                    </span>
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h3 className="text-base font-bold text-slate-900 leading-snug mb-2 line-clamp-2">
                                                            {script.title}
                                                        </h3>
                                                        {isDisabled && (
                                                            <span className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md whitespace-nowrap">Sắp ra mắt</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[13px] text-slate-600 line-clamp-2 leading-relaxed">
                                                        {script.desc}
                                                    </p>
                                                </div>

                                                <div className="mt-auto pt-4 space-y-4">
                                                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock size={14} />
                                                            {script.time}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Layers size={14} />
                                                            {script.parts}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        {!isDisabled && (
                                                            <Link href={`/setup?topic=${encodeURIComponent(script.title)}`} className="bg-[var(--teal)] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors inline-block text-center shadow-[0_2px_10px_rgba(20,184,166,0.2)]">
                                                                Dùng kịch bản này
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Pagination */}
                                <div className="flex items-center justify-center gap-4 pt-8 pb-10">
                                    <button className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
                                        Trang trước
                                    </button>
                                    <div className="flex items-center gap-1">
                                        <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--navy)] text-white text-sm font-bold">1</button>
                                        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors">2</button>
                                        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors">3</button>
                                    </div>
                                    <button className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                                        Trang sau
                                    </button>
                                </div>
                            </div>

                            {/* Right Panel: Quick View */}
                            <div className="lg:w-[320px] shrink-0 lg:sticky lg:top-10">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                        <h3 className="font-bold text-slate-900">Xem nhanh</h3>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <p className="font-semibold text-slate-800 text-sm leading-snug">
                                            {selectedScript?.title || 'Chưa chọn kịch bản'}
                                        </p>

                                        <div className="w-full h-[1px] bg-slate-100" />

                                        <ul className="space-y-3">
                                            {selectedScript?.details?.map((detail, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-[13px] text-slate-600 leading-relaxed">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                                                    <p><span className="font-semibold text-slate-800">{detail.title}:</span> {detail.desc}</p>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="pt-2">
                                            <Link href={`/setup?topic=${encodeURIComponent(selectedScript?.title || '')}`} className="block w-full text-center bg-[var(--teal)] text-white text-[13px] font-bold py-2.5 rounded-xl hover:bg-teal-600 transition-colors shadow-sm">
                                                Vào luyện với kịch bản này
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
