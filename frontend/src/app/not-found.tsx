import { Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div
        className="flex flex-col items-center gap-4 p-8 rounded-2xl shadow-lg max-w-sm text-center"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <p className="text-6xl font-bold" style={{ color: 'var(--teal)' }}>404</p>
        <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
          Trang không tồn tại
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--teal)' }}
        >
          <Home className="w-4 h-4" />
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
