'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowRight, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const passwordRules = [
    { label: 'Ít nhất 8 ký tự', pass: form.password.length >= 8 },
    { label: 'Có chữ hoa', pass: /[A-Z]/.test(form.password) },
    { label: 'Có số', pass: /[0-9]/.test(form.password) },
  ];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập họ tên.';
    if (!form.email.includes('@')) e.email = 'Email không hợp lệ.';
    if (form.password.length < 8) e.password = 'Mật khẩu tối thiểu 8 ký tự.';
    if (form.password !== form.confirm) e.confirm = 'Mật khẩu xác nhận không khớp.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsLoading(false);

    if (error) {
      setErrors({ submit: error.message });
      return;
    }

    setSuccessMsg('Tài khoản đã tạo! Kiểm tra email để xác nhận trước khi đăng nhập.');
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErrors({ submit: error.message });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">

      {/* ── LEFT PANEL: Branding ── */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between bg-[#0b1120] px-12 py-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-[-80px] left-[-80px] w-[340px] h-[340px] bg-teal-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[260px] h-[260px] bg-teal-400/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0f1b2d] border border-slate-700/60 flex items-center justify-center rounded-lg overflow-hidden">
            <Image src="/brand-logo.png" alt="SpeakMate" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <span className="text-white font-bold text-lg tracking-wide">SpeakMate</span>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-teal-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
            AI Mentor · Tiếng Việt
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Luyện nói tự tin<br />
            <span className="text-teal-400">không áp lực</span>
          </h1>
          <p className="text-slate-400 text-[15px] leading-relaxed max-w-sm">
            Mentor Ni sẽ đồng hành cùng bạn qua từng kịch bản thực tế —
            từ phỏng vấn, thuyết trình đến giao tiếp hàng ngày.
          </p>
          <ul className="space-y-3 pt-2">
            {[
              'Tạo kịch bản theo mục tiêu cá nhân',
              'Phân tích phát âm & độ trôi chảy',
              'Gợi ý tức thì khi bí ý tưởng',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                <div className="w-5 h-5 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-teal-400" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-teal-500/40 flex-shrink-0 bg-slate-800">
            <Image src="/ni-avatar.png" alt="Mentor Ni" width={48} height={48} className="object-cover" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Mentor Ni</p>
            <p className="text-slate-400 text-xs mt-0.5">&ldquo;Hãy để Ni giúp bạn trở nên tự tin hơn mỗi ngày!&rdquo;</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ── */}
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc] px-6 py-10">
        <div className="w-full max-w-[420px] space-y-7">

          <div className="flex lg:hidden items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#0f172a] flex items-center justify-center rounded-lg overflow-hidden">
              <Image src="/brand-logo.png" alt="SpeakMate" width={32} height={32} className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-slate-800">SpeakMate</span>
          </div>

          <div>
            <h2 className="text-[28px] font-bold text-slate-900 leading-tight">Tạo tài khoản</h2>
            <p className="text-slate-500 text-sm mt-1">
              Đã có tài khoản?{' '}
              <Link href="/login" className="text-teal-600 font-semibold hover:text-teal-700 transition-colors">
                Đăng nhập
              </Link>
            </p>
          </div>

          {/* Success message */}
          {successMsg && (
            <div className="px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-700 flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-60"
          >
            {isGoogleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Tiếp tục với Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">hoặc dùng email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {errors.submit && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {errors.submit}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Họ và tên</label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-white outline-none transition-all
                  ${errors.name ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'}`}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                placeholder="ban@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-white outline-none transition-all
                  ${errors.email ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'}`}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 8 ký tự"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-white outline-none transition-all
                    ${errors.password ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'}`}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              {form.password.length > 0 && (
                <div className="flex gap-3 pt-1 flex-wrap">
                  {passwordRules.map((r, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${r.pass ? 'bg-teal-500' : 'bg-slate-300'}`} />
                      <span className={`text-[11px] ${r.pass ? 'text-teal-600' : 'text-slate-400'}`}>{r.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-white outline-none transition-all
                    ${errors.confirm ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'}`}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Bằng cách đăng ký, bạn đồng ý với{' '}
              <span className="text-teal-600 cursor-pointer hover:underline">Điều khoản dịch vụ</span>{' '}
              và{' '}
              <span className="text-teal-600 cursor-pointer hover:underline">Chính sách bảo mật</span>.
            </p>

            <button
              type="submit"
              disabled={isLoading || !!successMsg}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-teal-500/25 hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo tài khoản...</>
              ) : (
                <>Tạo tài khoản <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
//dsvdv