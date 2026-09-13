/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#e8e2d6",
        mute: "#8c8578",
        rust: "#c47a4a",
        dusk: "#07060a",
      },
      fontFamily: {
        serif: ["Fraunces", "Times New Roman", "serif"],
        sans: ["Outfit", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
