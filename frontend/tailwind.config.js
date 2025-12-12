/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // MediaCore Premium Dark Theme Colors
        mediacore: {
          // Backgrounds
          'bg-app': '#0B0F14',
          'bg-card': '#111827',
          'bg-card-hover': '#161E2E',
          'bg-sidebar': '#0B0F14',
          
          // Text colors
          'text-heading': '#F9FAFB',
          'text-title': '#FFFFFF',
          'text-secondary': '#9CA3AF',
          'text-muted': '#6B7280',
          'text-disabled': '#6B7280',
          
          // Accent colors
          'accent-primary': '#22C55E',
          'accent-primary-hover': '#16A34A',
          'accent-spiritual': '#8B5CF6',
          'accent-highlight': '#6366F1',
          
          // Button colors
          'btn-primary-bg': '#22C55E',
          'btn-primary-text': '#0B0F14',
          'btn-primary-hover': '#16A34A',
          'btn-secondary-border': '#374151',
          'btn-secondary-text': '#E5E7EB',
          'btn-disabled-bg': '#1F2937',
          'btn-disabled-text': '#6B7280',
          
          // Icon colors
          'icon-default': '#9CA3AF',
          'icon-hover': '#E5E7EB',
          'icon-active': '#22C55E',
          
          // Sidebar colors
          'sidebar-item': '#D1D5DB',
          'sidebar-hover': '#E5E7EB',
          'sidebar-active': '#22C55E',
        },
        // Spotify-inspired colors (legacy support)
        spotify: {
          green: "#1DB954",
          black: "#191414",
          darkgray: "#121212",
          lightgray: "#282828",
          white: "#FFFFFF",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-down": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: 0 },
          to: { transform: "scale(1)", opacity: 1 },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(34, 197, 94, 0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(34, 197, 94, 0.8)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-spotify': 'linear-gradient(180deg, rgba(34,197,94,0.3) 0%, rgba(11,15,20,1) 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
