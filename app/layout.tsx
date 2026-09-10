import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'MEKICS Global Service Portal',
  description: 'MEKICS Service Portal Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <header className="bg-[#0B1727] text-white px-6 py-3 flex justify-between items-center border-b border-slate-800 print:hidden">
          <Link href="/" className="font-bold text-base hover:text-blue-400 transition">
            MEKICS Global Service
          </Link>
          <Link href="/admin" className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-semibold transition flex items-center gap-1">
            ⚙️ 관리자 설정
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}