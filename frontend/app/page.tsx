'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { WaveformPulse } from '@/components/shared/waveform';

export default function RootPage() {
  const router = useRouter();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isHydrated) return;
    if (user) {
      router.replace(user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isHydrated, user, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink">
      <WaveformPulse bars={16} className="h-10" />
      <p className="font-mono text-xs uppercase tracking-widest text-primary/80">Loading session…</p>
    </div>
  );
}
