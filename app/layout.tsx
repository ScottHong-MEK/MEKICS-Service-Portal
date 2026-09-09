// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MEKICS Global Service Portal",
  description: "Medical Equipment Service Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50">
        {/* --- 상단 공통 네비게이션 바 --- */}
        <header className="bg-slate-900 text-white px-6 py-3.5 flex justify-between items-center shadow-md">
          <a href="/" className="font-bold text-lg tracking-tight hover:text-blue-400 transition-colors">
            MEKICS Global Service
          </a>
          
          <a
            href="/admin"
            className="bg-slate-800 text-slate-100 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition flex items-center gap-2 border border-slate-700"
          >
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            관리자 설정
          </a>
        </header>

        {/* --- 각 페이지 콘텐츠 영역 --- */}
        <main>{children}</main>
      </body>
    </html>
  );
}