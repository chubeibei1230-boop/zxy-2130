import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  getRole: () => UserRole | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      login: (user, token) => set({ user, accessToken: token }),
      logout: () => set({ user: null, accessToken: null }),
      getRole: () => get().user?.role || null,
    }),
    {
      name: 'auth-storage',
    }
  )
);
