import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/nav';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: `${APP_NAME}: ${APP_TAGLINE}`,
  description:
    'Crowd-repayment for student debt. An AI agent on the PayPal platform routes every dollar straight to the loan servicer.',
};

export default function RootLayout({ children }: LayoutProps<'/'>): React.ReactElement {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          {APP_NAME} runs entirely in the PayPal sandbox. No real money moves. Built on the PayPal
          Agent Toolkit.
        </footer>
      </body>
    </html>
  );
}
