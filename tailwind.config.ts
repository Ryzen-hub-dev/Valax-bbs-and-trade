import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        obsidian: {
          950: "#05070a",
          900: "#080c14",
          850: "#0d121f",
          800: "#131a2c",
          750: "#1a233b",
          700: "#222e4d",
        },
        gold: {
          300: "#fde68a",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        cyan: {
          400: "#38bdf8",
          500: "#0ea5e9",
        },
        emerald: {
          400: "#34d399",
          500: "#10b981",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
      },
      boxShadow: {
        "glow-gold": "0 0 25px -5px rgba(245, 158, 11, 0.25)",
        "glow-cyan": "0 0 25px -5px rgba(14, 165, 233, 0.25)",
        "glow-subtle": "0 0 20px -3px rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "grid-pattern": "radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px)",
        "hero-gradient": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245, 158, 11, 0.15), transparent 70%)",
        "card-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.005) 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;