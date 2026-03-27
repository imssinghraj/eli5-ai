import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        bg: {
          base: "#0a0a0b",
          elevated: "#111113",
          overlay: "#18181b",
          muted: "#1e1e22",
        },
        border: {
          subtle: "#1f1f23",
          DEFAULT: "#2a2a2f",
          strong: "#3a3a42",
        },
        text: {
          primary: "#f0f0f2",
          secondary: "#9898a5",
          muted: "#5a5a68",
          accent: "#7b7bf5",
        },
        accent: {
          DEFAULT: "#7b7bf5",
          dim: "#4a4a9a",
          glow: "rgba(123,123,245,0.15)",
        },
        success: "#4ade80",
        warning: "#fbbf24",
        error: "#f87171",
      },
      boxShadow: {
        glow: "0 0 20px rgba(123,123,245,0.12)",
        card: "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
        "card-hover":
          "0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        shimmer: "shimmer 1.5s infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
