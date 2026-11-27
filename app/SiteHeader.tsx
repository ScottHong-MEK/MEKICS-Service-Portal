'use client'

import Link from 'next/link'
import { useLang, LanguageToggle } from './lib/i18n'

export default function SiteHeader() {
  const { t } = useLang()
  return (
    <header className="bg-[#0B1727] text-white px-4 md:px-6 py-3 flex justify-between items-center gap-3 border-b border-slate-800 print:hidden">
      <Link href="/" className="font-bold text-base hover:text-blue-400 transition">
        MEKICS Global Service
      </Link>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <Link href="/admin" className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-semibold transition flex items-center gap-1">
          {t('⚙️ 관리자 설정')}
        </Link>
      </div>
    </header>
  )
}
