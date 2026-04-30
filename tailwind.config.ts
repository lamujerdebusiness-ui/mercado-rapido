import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    {
      pattern: /(bg|border|text)-(amber|blue|cyan|emerald|fuchsia|indigo|lime|orange|pink|purple|rose|sky|slate|teal|violet)-(50|100|200|500|700)/,
    },
    {
      pattern: /bg-(amber|blue|cyan|emerald|fuchsia|indigo|lime|orange|pink|purple|rose|sky|slate|teal|violet)-50\/40/,
    },
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
