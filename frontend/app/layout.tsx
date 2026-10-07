import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Space_Grotesk, Inter, IBM_Plex_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const fontDisplay = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'AI Interview Preparation & Evaluation Platform',
  description:
    'Practice technical, HR, and coding interviews with AI-driven mock sessions, speech analysis, and resume ATS scoring.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
