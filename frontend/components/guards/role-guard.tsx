'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import type { UserRole } from '@/types/auth.types';
import { AuthGuard } from './auth-guard';

export function RoleGuard({ role, children }: { role: UserRole; children: ReactNode }) {
  return (
    <AuthGuard>
      <RoleCheck role={role}>{children}</RoleCheck>
    </AuthGuard>
  );
}

function RoleCheck({ role, children }: { role: UserRole; children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // AuthGuard guarantees `user` is set by the time this renders, but the
    // check stays defensive in case that invariant ever changes.
    if (user && user.role !== role) {
      router.replace(user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard');
    }
  }, [user, role, router]);

  if (!user || user.role !== role) {
    return null;
  }

  return <>{children}</>;
}
