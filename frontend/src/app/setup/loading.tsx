'use client';

import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function SetupLoading() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--teal)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>{t('loading.preparing')}</p>
      </div>
    </div>
  );
}
