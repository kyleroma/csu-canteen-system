/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Named after the food, so the palette stays honest
        rice: {
          50: "#FFFBF4", // page background
          100: "#F7EFE1", // subtle fills, dividers
          200: "#EADFCB", // borders
        },
        kape: {
          700: "#4A3A2F", // secondary text
          900: "#2A1E17", // primary text
        },
        ube: {
          50: "#F3EDF9",
          100: "#E4D8F1",
          600: "#6B34A0",
          700: "#5B2A86", // brand
          900: "#3A1A57",
        },
        calamansi: {
          50: "#FEF6E6",
          100: "#FCE9C2",
          500: "#F5A524", // actions
          600: "#D98A0E",
        },
        dahon: {
          50: "#EAF3EC",
          100: "#D3E6D8",
          600: "#2F6B3F", // available, ready
          700: "#245431",
        },
        sili: {
          50: "#FBEBE9",
          100: "#F6D5D1",
          600: "#C8372D", // sold out, full, closed
          700: "#A62C24",
        },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "system-ui", "sans-serif"],
        sans: ["'Be Vietnam Pro'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
