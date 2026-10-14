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
        bg: "#0A0B0E",
        surface: "#101216",
        "surface-2": "#171A20",
        "surface-3": "#262A33",
        border: "#262A33",
        "border-light": "#3f3f46",
        text: "#ECE6D8",
        muted: "#A39D90",
        ink: {
          950: "#0A0B0E",
          900: "#101216",
          800: "#171A20",
        },
        line: "#262A33",
        bone: {
          DEFAULT: "#ECE6D8",
          dim: "#A39D90",
        },
        lamp: {
          DEFAULT: "#D9A441",
          soft: "#F0D79A",
        },
        blood: {
          DEFAULT: "#B3363B",
          deep: "#7E2327",
        },
        night: {
          DEFAULT: "#3E5A78",
          deep: "#16222F",
        },
        verdigris: "#5E8C7B",
        plum: "#7A5C86",
        mafia: {
          DEFAULT: "#B3363B",
          deep: "#7E2327",
        },
        doctor: {
          DEFAULT: "#5E8C7B",
          dark: "#171A20",
        },
        police: {
          DEFAULT: "#3E5A78",
          surface: "#101216",
          border: "#262A33",
        },
        vigilante: "#A39D90",
        jester: "#7A5C86",
        civilian: "#A39D90",
        god: "#ECE6D8",
        day: {
          amber: "#D9A441",
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
