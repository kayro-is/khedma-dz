import type { Metadata } from 'next';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';

import { directionOf } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-arabic',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${inter.variable} ${notoArabic.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
