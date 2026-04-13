'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function PracticeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PracticeError]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-slate-950">
      <div className="flex flex-col items-center gap-5 p-8 rounded-2xl max-w-md text-center bg-slate-900 border border-slate-800">
        <AlertTriangle className="w-12 h-12 text-amber-400" />
        <h1 className="text-xl font-bold text-white">
          Phiên luyện tập gặp lỗi
        </h1>
        <p className="text-sm text-slate-400">
          {error.message?.slice(0, 300) || 'Có lỗi xảy ra trong quá trình luyện tập.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-teal-500 hover:bg-teal-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Thử lại
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
