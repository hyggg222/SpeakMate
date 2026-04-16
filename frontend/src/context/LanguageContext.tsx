'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { translations } from '@/i18n/translations'

export type Lang = 'vi' | 'en'
const LS_KEY = 'speakmate_language'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'vi',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start at 'vi' on both server and client to keep SSR HTML in sync
  // with the first client render. The user's saved preference is applied
  // in a useEffect AFTER hydration so React can safely re-render the tree.
  const [lang, setLangState] = useState<Lang>('vi')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as Lang | null
      if (saved === 'en' || saved === 'vi') {
        setLangState(saved)
        document.documentElement.lang = saved === 'en' ? 'en' : 'vi'
      }
    } catch {
      // localStorage unavailable — keep default
    }
  }, [])

  const setLang = (l: Lang) => {
    try { localStorage.setItem(LS_KEY, l) } catch { /* ignore */ }
    document.documentElement.lang = l === 'en' ? 'en' : 'vi'
    setLangState(l)
  }

  const t = (key: string): string =>
    translations[lang][key] ?? translations['vi'][key] ?? key

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {/* Keying on lang forces a full subtree remount when language changes.
          This guarantees that any descendant subtree which dropped out of
          re-rendering due to an earlier hydration mismatch (React #418)
          gets reconstructed cleanly with the new translations. */}
      <div key={lang} style={{ display: 'contents' }}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
