/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#15171C",      // background
        chalk: "#F3F1EA",    // main text
        signal: "#FF4B3E",   // primary accent - effort/heart-rate
        amber: "#FFB020",    // secondary accent - progress/streaks
        steel: "#8B93A1",    // muted text / borders
      },
      fontFamily: {
        display: ["var(--font-display)"], // Bebas Neue - headings
        body: ["var(--font-body)"],       // Inter - body text
        mono: ["var(--font-mono)"],       // JetBrains Mono - stats/numbers
      },
    },
  },
  plugins: [],
};
