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
        bg: "#08090D",
        surface: "#11131A",
        "surface-2": "#181B25",
        border: "#232736",
        text: "#ECEEF4",
        muted: "#8A90A2",
        mafia: {
          DEFAULT: "#E5383B",
          deep: "#7A1418",
        },
        doctor: {
          DEFAULT: "#F4F6FA",
          dark: "#0B0D12",
        },
        police: {
          DEFAULT: "#5B8CFF",
          surface: "#0E1A2B",
          border: "#1F3556",
        },
        vigilante: "#7C8CA6",
        jester: "#B58AD6",
        civilian: "#C9B79C",
        god: "#D6B15E",
        day: {
          amber: "#F2B84B",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
