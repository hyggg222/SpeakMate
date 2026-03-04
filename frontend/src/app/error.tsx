'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[RootError]', error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div
        className="flex flex-col items-center gap-5 p-8 rounded-2xl shadow-lg max-w-md text-center"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <AlertTriangle className="w-12 h-12" style={{ color: '#f59e0b' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Đã xảy ra lỗi
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {error.message?.slice(0, 300) || 'Ứng dụng gặp sự cố. Vui lòng thử lại.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--teal)' }}
          >
            <RotateCcw className="w-4 h-4" />
            Thử lại
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
