/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#000000",      // background - true black
        chalk: "#FFFFFF",    // main text - true white
        signal: "#FF6F00",   // primary accent - AV Fitness Gym orange
        amber: "#FF8F33",    // secondary accent - lighter orange for variety
        steel: "#9CA3AF",    // muted gray for secondary text/borders
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
