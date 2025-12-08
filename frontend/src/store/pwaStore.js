import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const usePWAStore = create(
  persist(
    (set, get) => ({
      // Install prompt event (not persisted)
      deferredPrompt: null,
      
      // Whether the app can be installed
      canInstall: false,
      
      // Whether the app is already installed
      isInstalled: false,
      
      // Whether the user dismissed the install prompt
      installDismissed: false,
      
      // Last time the prompt was dismissed (to show again after some time)
      lastDismissedAt: null,

      // Set the deferred prompt
      setDeferredPrompt: (prompt) => {
        set({ deferredPrompt: prompt, canInstall: !!prompt });
      },

      // Set installed state
      setInstalled: (installed) => {
        set({ isInstalled: installed, canInstall: !installed });
      },

      // Dismiss the install prompt
      dismissInstall: () => {
        set({ 
          installDismissed: true, 
          lastDismissedAt: new Date().toISOString() 
        });
      },

      // Reset dismiss (show prompt again)
      resetDismiss: () => {
        set({ installDismissed: false });
      },

      // Check if we should show the prompt
      shouldShowPrompt: () => {
        const { canInstall, isInstalled, installDismissed, lastDismissedAt } = get();
        
        if (isInstalled || !canInstall) return false;
        
        // If dismissed, check if enough time has passed (7 days)
        if (installDismissed && lastDismissedAt) {
          const daysSinceDismiss = (Date.now() - new Date(lastDismissedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceDismiss < 7) return false;
        }
        
        return true;
      },

      // Trigger the install prompt
      installApp: async () => {
        const { deferredPrompt } = get();
        
        if (!deferredPrompt) {
          return { success: false, message: 'Install not available' };
        }

        try {
          // Show the install prompt
          deferredPrompt.prompt();
          
          // Wait for the user's response
          const { outcome } = await deferredPrompt.userChoice;
          
          // Clear the deferred prompt
          set({ deferredPrompt: null, canInstall: false });
          
          if (outcome === 'accepted') {
            set({ isInstalled: true });
            return { success: true, message: 'App installed successfully!' };
          } else {
            set({ installDismissed: true, lastDismissedAt: new Date().toISOString() });
            return { success: false, message: 'Installation cancelled' };
          }
        } catch (error) {
          console.error('Install error:', error);
          return { success: false, message: error.message };
        }
      },
    }),
    {
      name: 'pwa-storage',
      partialize: (state) => ({
        installDismissed: state.installDismissed,
        lastDismissedAt: state.lastDismissedAt,
        isInstalled: state.isInstalled,
      }),
    }
  )
);

export default usePWAStore;
