'use client'

// 한/영 언어 전환
//  - 화면 문구는 t('한국어 문구') 로 감싸고, 영어 번역은 ./i18n-en.ts 사전에서 찾습니다.
//  - 선택한 언어는 브라우저에 저장되어 다음 접속 때도 유지됩니다.
//  - 처음 접속 시: 브라우저 언어가 한국어면 한국어, 아니면 영어 (해외 대리점은 자동으로 영어)

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { en } from './i18n-en'

export type Lang = 'ko' | 'en'

type LangContext = { lang: Lang; setLang: (l: Lang) => void; t: (ko: string) => string }

const Ctx = createContext<LangContext>({ lang: 'ko', setLang: () => {}, t: (s) => s })

const STORAGE_KEY = 'mek_lang'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko')

  useEffect(() => {
    let initial: Lang = 'ko'
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'ko' || saved === 'en') initial = saved
      else initial = (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en'
    } catch { /* 저장소 사용 불가 환경 */ }
    setLangState(initial)
  }, [])

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* 무시 */ }
  }, [])

  const t = useCallback((ko: string) => {
    if (lang === 'ko') return ko
    const v = en[ko]
    return v === undefined ? ko : v
  }, [lang])

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useLang = () => useContext(Ctx)

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang()
  const btn = (l: Lang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${lang === l ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
    >
      {label}
    </button>
  )
  return (
    <div className={`flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 ${className}`} role="group" aria-label="Language">
      {btn('ko', '한국어')}
      {btn('en', 'EN')}
    </div>
  )
}
