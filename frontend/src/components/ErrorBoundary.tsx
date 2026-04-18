'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { translations } from '@/i18n/translations';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function getLang(): 'vi' | 'en' {
  if (typeof window === 'undefined') return 'vi';
  return (localStorage.getItem('speakmate_language') as 'vi' | 'en') || 'vi';
}

function t(key: string): string {
  const lang = getLang();
  return translations[lang][key] ?? translations.vi[key] ?? key;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
          <AlertTriangle className="w-10 h-10" style={{ color: '#f59e0b' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            {t('error.occurred')}
          </h2>
          <p className="text-sm max-w-md" style={{ color: 'var(--muted-foreground)' }}>
            {this.state.error?.message?.slice(0, 200) || t('error.unknown')}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--teal)' }}
          >
            <RotateCcw className="w-4 h-4" />
            {t('common.retry')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
