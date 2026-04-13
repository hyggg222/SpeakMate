import { Loader2 } from 'lucide-react';

export default function SetupLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--teal)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Đang chuẩn bị...</p>
      </div>
    </div>
  );
}
