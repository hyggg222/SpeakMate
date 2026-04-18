'use client';

import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function PracticeLoading() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
        <p className="text-sm font-medium text-slate-400">{t('common.loading')}</p>
      </div>
    </div>
  );
}
