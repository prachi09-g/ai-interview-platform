'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { WaveformPulse } from '@/components/shared/waveform';

/**
 * Route protection is deliberately client-side, not Next.js middleware.
 * The backend (localhost:4000) and frontend (localhost:3000) are different
 * origins in this architecture, and the refresh token is an httpOnly
 * cookie scoped to the backend's own domain/path — Next.js middleware
 * running on the frontend origin cannot read it. useAuthBootstrap()
 * (called once in app/providers.tsx) silently exchanges that cookie for
 * an access token on load; this guard just waits for that to settle
 * before deciding whether to redirect.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace('/login');
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <WaveformPulse bars={16} className="h-8" />
      </div>
    );
  }

  return <>{children}</>;
}
