import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isAdminUser: false,
      error: null,
      needsPassword: false, // Track if Google user needs to set password

      /**
       * Login with email/password
       */
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authService.login(email, password);
          
          const isAdmin = data.user.role === 'admin' || 
                         data.user.email === process.env.REACT_APP_ADMIN_EMAIL;
          
          set({
            user: data.user,
            isAuthenticated: true,
            isAdminUser: isAdmin,
            isLoading: false,
            needsPassword: false
          });
          
          return data;
        } catch (error) {
          set({ 
            error: error.message, 
            isLoading: false,
            isAuthenticated: false 
          });
          throw error;
        }
      },

      /**
       * Login with Google OAuth
       */
      googleLogin: async (googleToken) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authService.googleLogin(googleToken);
          
          const isAdmin = data.user.role === 'admin' || 
                         data.user.email === process.env.REACT_APP_ADMIN_EMAIL;
          
          set({
            user: data.user,
            isAuthenticated: true,
            isAdminUser: isAdmin,
            isLoading: false,
            needsPassword: data.needsPassword || false
          });
          
          return data;
        } catch (error) {
          set({ 
            error: error.message, 
            isLoading: false,
            isAuthenticated: false 
          });
          throw error;
        }
      },

      /**
       * Set password for Google users
       */
      setPassword: async (newPassword) => {
        set({ isLoading: true, error: null });
        try {
          await authService.setPassword(newPassword);
          
          // Update user state to reflect password is now set
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: { ...currentUser, hasPassword: true },
              needsPassword: false,
              isLoading: false
            });
          }
          
          return { success: true };
        } catch (error) {
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      /**
       * Dismiss password prompt (user chose "Later")
       */
      dismissPasswordPrompt: () => {
        set({ needsPassword: false });
      },

      /**
       * Logout
       */
      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        set({
          user: null,
          isAuthenticated: false,
          isAdminUser: false,
          error: null
        });
      },

      /**
       * Initialize auth state (check token validity)
       */
      initAuth: async () => {
        set({ isLoading: true });
        
        try {
          if (authService.isAuthenticated()) {
            const user = await authService.getCurrentUser();
            
            const isAdmin = user.role === 'admin' || 
                           user.email === process.env.REACT_APP_ADMIN_EMAIL;
            
            set({
              user,
              isAuthenticated: true,
              isAdminUser: isAdmin,
              isLoading: false
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          // Clear invalid tokens
          await get().logout();
          set({ isLoading: false });
        }
      },

      /**
       * Set loading state
       */
      setLoading: (loading) => set({ isLoading: loading }),

      /**
       * Set user manually (for external updates)
       */
      setUser: (user) => {
        if (!user) {
          set({
            user: null,
            isAuthenticated: false,
            isAdminUser: false
          });
          return;
        }

        const isAdmin = user.role === 'admin' || 
                       user.email === process.env.REACT_APP_ADMIN_EMAIL;

        set({
          user,
          isAuthenticated: true,
          isAdminUser: isAdmin
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist these fields (not tokens - those are in localStorage)
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdminUser: state.isAdminUser,
        // Don't persist needsPassword - it should be fresh on each session
      }),
    }
  )
);

export default useAuthStore;
