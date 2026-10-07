import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SafeUser } from '@/types/auth.types';

interface AuthState {
  user: SafeUser | null;
  accessToken: string | null;
  /** True once the initial silent-refresh-on-load attempt has finished (success or failure). */
  isHydrated: boolean;
  setSession: (user: SafeUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setHydrated: () => void;
  clearSession: () => void;
}

/**
 * Deliberately does NOT persist accessToken to localStorage — it's a
 * short-lived (15m) token, and keeping it out of persisted storage limits
 * the blast radius of an XSS vulnerability reading localStorage. On page
 * load, the app calls POST /auth/refresh (using the httpOnly refresh
 * cookie) to silently re-obtain an access token — see hooks/use-auth.ts.
 * Only the last-known user is persisted, purely so the UI can render
 * "logged in as X" instantly instead of flashing a logged-out state while
 * that refresh call is in flight.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isHydrated: false,
      setSession: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setHydrated: () => set({ isHydrated: true }),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'ai-interview-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
