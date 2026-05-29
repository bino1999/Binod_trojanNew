import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,

      setAuth: (user, token, role) => set({ user, token, role }),

      logout: () => set({ user: null, token: null, role: null }),
    }),
    {
      name: 'ims-auth',
      partialize: (state) => ({ user: state.user, token: state.token, role: state.role }),
    }
  )
)
