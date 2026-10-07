import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Interview Preparation & Evaluation Platform',
  description:
    'Practice technical, HR, and coding interviews with AI-driven mock sessions, speech analysis, and resume ATS scoring.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}