'use client'

import { User, Bell, Shield, Moon, Monitor, Sun, Mic, Sliders, LogOut, Check, ChevronDown, CheckCircle2, ChevronRight, Settings } from 'lucide-react'
import Topbar from '@/components/dashboard/Topbar'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function SettingsPage() {
    const [displayName, setDisplayName] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const storedName = localStorage.getItem('speakmate_username') || '';
        setDisplayName(storedName);
    }, []);

    const handleSaveProfile = () => {
        localStorage.setItem('speakmate_username', displayName);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    return (
        <div className="flex flex-col min-h-[100vh] bg-[#f8fafc] w-full">
            <Topbar />

            <section className="flex-1 px-[5%] lg:px-[5%] xl:px-[8%] py-10 pb-20">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-800 mb-8 pl-1 tracking-tight">
                        Cài đặt & Hồ sơ
                    </h1>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
                        {/* Cột 1: Thông tin cá nhân & Tài khoản */}
                        <div className="space-y-6 lg:space-y-8 flex flex-col">
                            {/* Hồ sơ của bạn */}
                            <div className="bg-white rounded-2xl p-6 lg:p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-100 flex-1">
                                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Hồ sơ của bạn</h2>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                                            <span className="text-xl font-bold text-slate-400">NG</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-base">Nguyen Le Gia Huy</h3>
                                            <p className="text-sm text-slate-500 mb-1">nguyenlegiahuy@email.com</p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                Level: Người hùng biện tập sự
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Tên hiển thị</label>
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Nhập tên của bạn"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 font-medium"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Ngôn ngữ ưu tiên</label>
                                            <div className="relative">
                                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 font-medium pr-10 cursor-pointer">
                                                    <option>Vietnamese</option>
                                                    <option>English</option>
                                                </select>
                                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Múi giờ</label>
                                            <div className="relative">
                                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 font-medium pr-10 cursor-pointer">
                                                    <option>(GMT+7) Hanoi, Bangkok, Jakarta</option>
                                                </select>
                                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        <button onClick={handleSaveProfile} className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold text-sm transition-colors mt-2 shadow-sm shadow-teal-500/20">
                                            {saved ? '✓ Đã lưu!' : 'Lưu thay đổi'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Tài khoản & Bảo mật */}
                            <div className="bg-white rounded-2xl p-6 lg:p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-100 flex-none">
                                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">Tài khoản & Bảo mật</h2>
                                <div className="space-y-1">
                                    <button className="w-full flex items-center justify-between p-3 -mx-3 hover:bg-slate-50 rounded-xl transition-colors group">
                                        <span className="text-sm font-medium text-slate-700">Đổi mật khẩu</span>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                    </button>
                                    <button className="w-full flex items-center justify-between p-3 -mx-3 hover:bg-slate-50 rounded-xl transition-colors group">
                                        <span className="text-sm font-medium text-slate-700">Đăng nhập với Google</span>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                    </button>
                                    <button className="w-full flex items-center justify-between p-3 -mx-3 hover:bg-slate-50 rounded-xl transition-colors group">
                                        <span className="text-sm font-medium text-slate-700">Quản lý phiên đăng nhập</span>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Cột 2: Mục tiêu & Cài đặt luyện nói chung */}
                        <div className="space-y-6 lg:space-y-8 flex flex-col">
                            {/* Mục tiêu & Thói quen */}
                            <div className="bg-white rounded-2xl p-6 lg:p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-100 flex-none">
                                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Mục tiêu & Thói quen</h2>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-semibold text-slate-700 block">Mục tiêu luyện mỗi ngày</label>
                                        </div>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                                            <button className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 transition-colors font-medium">-</button>
                                            <span className="px-3 py-1.5 text-sm font-medium text-slate-700 border-x border-slate-200 min-w-[5rem] text-center bg-white">25 lần/ngày</span>
                                            <button className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 transition-colors font-medium">+</button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5 max-w-[70%]">
                                            <label className="text-sm font-semibold text-slate-700 block">Nhắc nhở streak</label>
                                        </div>
                                        {/* Toggle Switch */}
                                        <div className="relative inline-flex items-center cursor-pointer shrink-0">
                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-semibold text-slate-700 block">Giờ nhắc luyện tập</label>
                                        </div>
                                        <div className="relative shrink-0">
                                            <input
                                                type="time"
                                                defaultValue="20:00"
                                                className="pl-3 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                            />
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-400 leading-relaxed pt-2">Nhiệm vụ hôm nay và streak sẽ dựa trên các cài đặt này.</p>
                                </div>
                            </div>

                            {/* Cài đặt luyện nói (General) + Ni Hint */}
                            <div className="bg-white rounded-2xl p-6 lg:p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-100 flex-1 flex flex-col">
                                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Cài đặt luyện nói</h2>

                                <div className="flex-1 flex flex-col justify-center items-center mt-4">
                                    <div className="relative max-w-xs mx-auto">
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 shrink-0 relative rounded-full overflow-hidden border-2 border-teal-100">
                                                <Image
                                                    src="/ni-avatar.png"
                                                    alt="Mentor Ni"
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-xl rounded-tl-none border border-slate-100 shadow-sm relative text-sm text-slate-600 font-medium">
                                                Ni gợi ý: Đặt mục tiêu nhỏ nhưng đều đặn mỗi ngày sẽ giúp bạn tiến bộ nhanh hơn.
                                                {/* Tooltip triangle */}
                                                <div className="absolute top-0 -left-2 w-0 h-0 border-t-[0px] border-t-transparent border-r-[8px] border-r-slate-50 border-b-[10px] border-b-transparent"></div>
                                                <div className="absolute top-0 -left-[9px] w-0 h-0 border-t-[0px] border-t-transparent border-r-[9px] border-r-slate-100 border-b-[11px] border-b-transparent -z-10"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Cột 3: Chi tiết Luyện nói & Khác */}
                        <div className="space-y-6 lg:space-y-8 flex flex-col">

                            {/* Chi tiết Cài đặt luyện nói */}
                            <div className="bg-white rounded-2xl p-6 lg:p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-100 flex-none">
                                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6 opacity-0 hidden lg:block">Chi tiết</h2>

                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Chế độ mặc định khi vào luyện</label>
                                        <div className="relative">
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 font-medium pr-10 cursor-pointer">
                                                <option>Tranh biện</option>
                                                <option>Thuyết trình</option>
                                                <option>Giao tiếp</option>
                                            </select>
                                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                                        <span className="text-sm font-semibold text-slate-700">Độ dài mỗi lượt nói</span>
                                        <div className="relative w-28">
                                            <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 font-medium pr-8 cursor-pointer">
                                                <option>3 phút</option>
                                                <option>5 phút</option>
                                                <option>10 phút</option>
                                            </select>
                                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold text-slate-700">Độ khó câu hỏi</label>
                                        </div>
                                        <div className="relative pt-2">
                                            {/* Custom range slider styling would go in globals.css, using basic styling here */}
                                            <input
                                                type="range"
                                                min="1"
                                                max="3"
                                                defaultValue="2"
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                            />
                                            <div className="flex justify-between text-[11px] font-medium text-slate-400 mt-2 px-1">
                                                <span>Dễ</span>
                                                <span>Khó</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Giọng AI phản hồi</label>
                                        <div className="relative">
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 font-medium pr-10 cursor-pointer">
                                                <option>Nữ (Giọng chuẩn)</option>
                                                <option>Nam (Giọng trầm)</option>
                                            </select>
                                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <button className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold text-sm transition-colors mt-4 shadow-sm shadow-teal-500/20">
                                        Lưu cài đặt
                                    </button>
                                </div>
                            </div>

                            {/* Khác (Theme & Danger Zone) */}
                            <div className="bg-white rounded-2xl p-6 lg:p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-100 flex-none">
                                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Khác</h2>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">Giao diện</span>
                                        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative flex items-center justify-center w-4 h-4">
                                                    <input type="radio" name="theme" className="peer sr-only" defaultChecked />
                                                    <div className="w-4 h-4 rounded-full border border-slate-300 peer-checked:border-teal-500 transition-colors"></div>
                                                    <div className="w-2 h-2 rounded-full bg-teal-500 absolute scale-0 peer-checked:scale-100 transition-transform"></div>
                                                </div>
                                                <span className="group-hover:text-slate-800 transition-colors">Sáng</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative flex items-center justify-center w-4 h-4">
                                                    <input type="radio" name="theme" className="peer sr-only" />
                                                    <div className="w-4 h-4 rounded-full border border-slate-300 peer-checked:border-teal-500 transition-colors"></div>
                                                    <div className="w-2 h-2 rounded-full bg-teal-500 absolute scale-0 peer-checked:scale-100 transition-transform"></div>
                                                </div>
                                                <span className="group-hover:text-slate-800 transition-colors">Tối</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative flex items-center justify-center w-4 h-4">
                                                    <input type="radio" name="theme" className="peer sr-only" />
                                                    <div className="w-4 h-4 rounded-full border border-slate-300 peer-checked:border-teal-500 transition-colors"></div>
                                                    <div className="w-2 h-2 rounded-full bg-teal-500 absolute scale-0 peer-checked:scale-100 transition-transform"></div>
                                                </div>
                                                <span className="group-hover:text-slate-800 transition-colors">Tự động</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <button className="w-full py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium text-sm transition-colors text-center">
                                            Xoá dữ liệu luyện tập
                                        </button>
                                        <button className="w-full py-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors text-center">
                                            Đăng xuất
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
