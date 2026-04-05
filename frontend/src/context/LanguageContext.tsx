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
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'vi'
    return (localStorage.getItem(LS_KEY) as Lang) || 'vi'
  })

  const setLang = (l: Lang) => {
    localStorage.setItem(LS_KEY, l)
    document.documentElement.lang = l === 'en' ? 'en' : 'vi'
    setLangState(l)
  }

  const t = (key: string): string =>
    translations[lang][key] ?? translations['vi'][key] ?? key

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'vi'
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
