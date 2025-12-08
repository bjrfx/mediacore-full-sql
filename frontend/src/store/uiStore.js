import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUIStore = create(
  persist(
    (set) => ({
      // Sidebar state
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleMobileSidebar: () => set((state) => ({ sidebarMobileOpen: !state.sidebarMobileOpen })),
      closeMobileSidebar: () => set({ sidebarMobileOpen: false }),

      // Theme (always dark, but keeping for future)
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // Search
      searchQuery: '',
      searchFilter: 'all', // 'all', 'video', 'audio'
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchFilter: (filter) => set({ searchFilter: filter }),

      // Notifications / Toast
      toasts: [],
      addToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            {
              id: Date.now(),
              ...toast,
            },
          ],
        })),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      // Modal states
      modals: {
        createPlaylist: false,
        addToPlaylist: false,
        confirmDelete: false,
        settings: false,
        login: false,
      },
      modalData: null,
      
      openModal: (modalName, data = null) =>
        set((state) => ({
          modals: { ...state.modals, [modalName]: true },
          modalData: data,
        })),
      closeModal: (modalName) =>
        set((state) => ({
          modals: { ...state.modals, [modalName]: false },
          modalData: null,
        })),
      closeAllModals: () =>
        set({
          modals: {
            createPlaylist: false,
            addToPlaylist: false,
            confirmDelete: false,
            settings: false,
            login: false,
          },
          modalData: null,
        }),

      // View mode
      viewMode: 'grid', // 'grid' or 'list'
      setViewMode: (mode) => set({ viewMode: mode }),

      // Loading states
      isGlobalLoading: false,
      setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        viewMode: state.viewMode,
      }),
    }
  )
);

export default useUIStore;
