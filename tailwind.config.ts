import type { Config } from "tailwindcss";

/**
 * FOREAS Partners — Tailwind config
 * Pixel-perfect avec FOREAS-Clean/src/design/premium.ts
 * Palette dark-first obsidian / violet-royal / cyan-electric
 */
export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ═══ Fond obsidian (cohérence app mobile) ═══
        obsidian: "#0B0F1E",
        "obsidian-deep": "#070A14",
        "obsidian-light": "#111528",

        // ═══ Glass overlays ═══
        "glass-high": "rgba(17, 21, 40, 0.88)",
        "glass-low": "rgba(17, 21, 40, 0.55)",
        "glass-border": "rgba(255, 255, 255, 0.08)",
        "glass-border-high": "rgba(255, 255, 255, 0.18)",

        // ═══ Accents signature (pixel-match mobile) ═══
        "violet-royal": "#8C52FF",
        "violet-deep": "#6C3CE0",
        "cyan-electric": "#00D4FF",
        "cyan-ice": "#6DEAFF",
        "gold-subtle": "#F5C842",
        "gold-radiant": "#FFD659",

        // ═══ Sémantiques ═══
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",

        // ═══ Texte ═══
        "text-primary": "#FFFFFF",
        "text-secondary": "rgba(255, 255, 255, 0.72)",
        "text-tertiary": "rgba(255, 255, 255, 0.45)",
        "text-muted": "rgba(255, 255, 255, 0.28)",
        "text-hero": "#F8FAFC",

        // shadcn compat
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "#8C52FF",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#00D4FF",
          foreground: "#0B0F1E",
        },
        muted: {
          DEFAULT: "#111528",
          foreground: "rgba(255, 255, 255, 0.72)",
        },
        accent: {
          DEFAULT: "#8C52FF",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        border: "rgba(255, 255, 255, 0.08)",
        input: "rgba(255, 255, 255, 0.08)",
        ring: "#8C52FF",
        card: {
          DEFAULT: "rgba(17, 21, 40, 0.88)",
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#111528",
          foreground: "#FFFFFF",
        },
      },
      backgroundImage: {
        "gradient-hero":
          "linear-gradient(135deg, #8C52FF 0%, #6C3CE0 50%, #00D4FF 100%)",
        "gradient-royal":
          "linear-gradient(135deg, #8C52FF 0%, #6C3CE0 100%)",
        "gradient-ice":
          "linear-gradient(135deg, #00D4FF 0%, #6DEAFF 100%)",
        "gradient-success":
          "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
        "gradient-danger":
          "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
        "gradient-card":
          "linear-gradient(135deg, rgba(140,82,255,0.15) 0%, rgba(0,212,255,0.05) 100%)",
        "gradient-bg":
          "linear-gradient(180deg, #0B0F1E 0%, #111528 50%, #0B0F1E 100%)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "SF Pro Display", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "SF Pro Display", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xxl": ["56px", { lineHeight: "60px", fontWeight: "900", letterSpacing: "-2px" }],
        "display-xl": ["42px", { lineHeight: "48px", fontWeight: "900", letterSpacing: "-1.5px" }],
        "display-l": ["32px", { lineHeight: "38px", fontWeight: "800", letterSpacing: "-1px" }],
        h1: ["24px", { lineHeight: "30px", fontWeight: "800", letterSpacing: "-0.6px" }],
        h2: ["20px", { lineHeight: "26px", fontWeight: "700", letterSpacing: "-0.4px" }],
        h3: ["17px", { lineHeight: "22px", fontWeight: "700", letterSpacing: "-0.2px" }],
        "body-lg": ["16px", { lineHeight: "22px", fontWeight: "500" }],
        body: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-bold": ["14px", { lineHeight: "20px", fontWeight: "700" }],
        label: ["12px", { lineHeight: "16px", fontWeight: "600", letterSpacing: "0.2px" }],
        caption: ["11px", { lineHeight: "14px", fontWeight: "500", letterSpacing: "0.15px" }],
        micro: ["10px", { lineHeight: "13px", fontWeight: "600", letterSpacing: "0.5px" }],
        eyebrow: ["10px", { lineHeight: "14px", fontWeight: "800", letterSpacing: "2.5px" }],
      },
      spacing: {
        xxs: "2px",
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        xxl: "24px",
        xxxl: "32px",
        huge: "48px",
        massive: "64px",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px",
        pill: "999px",
      },
      animation: {
        "pulse-violet": "pulse-violet 2.4s infinite ease-in-out",
        "fade-in-down": "fade-in-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in-right": "fade-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2s infinite linear",
        "pulse-soft": "pulse-soft 3s infinite ease-in-out",
      },
      keyframes: {
        "pulse-violet": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(140, 82, 255, 0.4)" },
          "50%": { boxShadow: "0 0 0 14px rgba(140, 82, 255, 0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-right": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(140, 82, 255, 0.35)",
        "glow-cyan": "0 0 24px rgba(0, 212, 255, 0.35)",
        "glow-success": "0 0 24px rgba(16, 185, 129, 0.35)",
        "glow-danger": "0 0 24px rgba(239, 68, 68, 0.35)",
        "card-elevated": "0 8px 32px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
