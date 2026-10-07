'use client';

import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService, type LoginPayload, type RegisterPayload } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth-store';
import { getApiErrorMessage } from '@/lib/api-client';

/**
 * Runs once on app load: tries to silently exchange the httpOnly refresh
 * cookie (if any) for a fresh access token, then fetches the current user.
 * This is what lets a page refresh keep you logged in even though the
 * access token itself is deliberately never persisted (see auth-store.ts).
 * Safe to call from multiple components — internally a no-op after the
 * first successful run since isHydrated flips to true.
 */
export function useAuthBootstrap() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    if (isHydrated) return;

    let cancelled = false;

    (async () => {
      try {
        const { accessToken } = await authService.refresh();
        useAuthStore.getState().setAccessToken(accessToken);
        const user = await authService.getMe();
        if (!cancelled) setSession(user, accessToken);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setHydrated();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}

export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (data) => {
      setSession(data.user, data.accessToken);
      router.replace(data.user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard');
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
  });
}

export function useLogout() {
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // Clear client state even if the network call fails — the user's
      // intent to log out shouldn't be blocked by a flaky request.
      clearSession();
      router.push('/login');
    },
  });
}

export { getApiErrorMessage };
