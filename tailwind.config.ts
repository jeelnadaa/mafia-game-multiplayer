import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#09090b",
        surface: "#111113",
        "surface-2": "#18181b",
        "surface-3": "#27272a",
        border: "#27272a",
        "border-light": "#3f3f46",
        text: "#fafafa",
        muted: "#a1a1aa",
        mafia: {
          DEFAULT: "#ffffff",
          deep: "#27272a",
        },
        doctor: {
          DEFAULT: "#e4e4e7",
          dark: "#18181b",
        },
        police: {
          DEFAULT: "#d4d4d8",
          surface: "#18181b",
          border: "#3f3f46",
        },
        vigilante: "#a1a1aa",
        jester: "#e4e4e7",
        civilian: "#71717a",
        god: "#ffffff",
        day: {
          amber: "#ffffff",
        },
      },
      fontFamily: {
        heading: ["'Satoshi'", "sans-serif"],
        body: ["'Satoshi'", "sans-serif"],
        sans: ["'Satoshi'", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
        none: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
        full: "0px",
      },
    },
  },
  plugins: [],
};

export default config;
