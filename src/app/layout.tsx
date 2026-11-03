import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/nav';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], weight: ['500'] });
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: `${APP_NAME}: ${APP_TAGLINE}`,
  description:
    'Crowd-repayment for student debt. An AI agent on the PayPal platform routes every dollar straight to the loan servicer.',
};

export default function RootLayout({ children }: LayoutProps<'/'>): React.ReactElement {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12">{children}</main>
        <footer className="border-t border-border px-6 py-6">
          <div className="label mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2 normal-case tracking-normal">
            <span>{APP_NAME} runs entirely in the PayPal sandbox. No real money moves.</span>
            <span>Built on the PayPal Agent Toolkit.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
