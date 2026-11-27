import './globals.css';
import { LanguageProvider } from './lib/i18n';
import SiteHeader from './SiteHeader';

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
        <LanguageProvider>
          <SiteHeader />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
