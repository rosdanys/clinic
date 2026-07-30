import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-space-mono)", "Space Mono", "monospace"],
        sans: ["var(--font-dm-sans)", "DM Sans", "system-ui", "sans-serif"],
        display: ["var(--font-space-mono)", "Space Mono", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        coinpulse: {
          blue: "#2563EB",
          lime: "#84CC16",
          amber: "#F59E0B",
          zinc: "#71717A",
          surface: "#18181B",
          background: "#09090B",
          success: "#22C55E",
          error: "#EF4444",
        },
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        full: "9999px",
      },
      boxShadow: {
        "glow-subtle": "0 0 8px hsla(221, 83%, 53%, 0.15)",
        "glow": "0 0 16px hsla(221, 83%, 53%, 0.25)",
        "glow-lg": "0 0 24px hsla(221, 83%, 53%, 0.35)",
        "glow-overlay": "0 0 40px hsla(0, 0%, 0%, 0.60)",
        "glow-profit": "0 0 12px hsla(142, 71%, 45%, 0.30)",
        "glow-loss": "0 0 12px hsla(0, 84%, 60%, 0.30)",
      },
      keyframes: {
        "pulse-green": {
          "0%, 100%": { color: "#22C55E" },
          "50%": { color: "#FAFAFA" },
        },
        "pulse-red": {
          "0%, 100%": { color: "#EF4444" },
          "50%": { color: "#FAFAFA" },
        },
        "flash-green": {
          "0%": { backgroundColor: "hsla(142, 71%, 45%, 0.20)" },
          "100%": { backgroundColor: "transparent" },
        },
        "flash-red": {
          "0%": { backgroundColor: "hsla(0, 84%, 60%, 0.20)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      animation: {
        "pulse-green": "pulse-green 1s ease-in-out 2",
        "pulse-red": "pulse-red 1s ease-in-out 2",
        "flash-green": "flash-green 1s ease-out forwards",
        "flash-red": "flash-red 1s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
