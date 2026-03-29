'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setIsLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setIsLoading(false);

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('Email hoặc mật khẩu không đúng.');
      } else if (authError.message.includes('Email not confirmed')) {
        setError('Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.');
      } else {
        setError(authError.message);
      }
      return;
    }

    router.push('/');
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError(authError.message);
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

        <div className="relative z-10 space-y-5">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Chào mừng<br /><span className="text-teal-400">trở lại!</span>
          </h1>
          <p className="text-slate-400 text-[15px] leading-relaxed max-w-sm">
            Hành trình luyện tập của bạn vẫn đang chờ. Tiếp tục cùng Mentor Ni nhé.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-teal-500/40 flex-shrink-0 bg-slate-800">
            <Image src="/ni-avatar.png" alt="Mentor Ni" width={48} height={48} className="object-cover" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Mentor Ni</p>
            <p className="text-slate-400 text-xs mt-0.5">&ldquo;Ni nhớ bạn lắm! Hôm nay luyện gì nhỉ?&rdquo;</p>
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
            <h2 className="text-[28px] font-bold text-slate-900">Đăng nhập</h2>
            <p className="text-slate-500 text-sm mt-1">
              Chưa có tài khoản?{' '}
              <Link href="/signup" className="text-teal-600 font-semibold hover:text-teal-700 transition-colors">
                Tạo tài khoản
              </Link>
            </p>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
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
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                placeholder="ban@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-sm bg-white outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
                <Link href="/forgot-password" className="text-xs text-teal-600 hover:text-teal-700 transition-colors">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-sm bg-white outline-none transition-all"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-teal-500/25 hover:-translate-y-0.5 active:translate-y-0 mt-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang đăng nhập...</>
              ) : (
                <>Đăng nhập <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
