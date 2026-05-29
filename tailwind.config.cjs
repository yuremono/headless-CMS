/** scss/_01variables.scss の CSS 変数 → bg-MC, text-TC 等（/NN 透明度対応） */
const cssVarColor = (varName) => {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `var(--${varName})`;
    }
    const pct = Math.round(Number(opacityValue) * 100);
    return `color-mix(in oklch, var(--${varName}) ${pct}%, transparent)`;
  };
};

const paletteKeys = ["MC", "SC", "AC", "BC", "TC", "GR", "BK", "WH"];
const semanticKeys = [
  "background",
  "foreground",
  "primary",
  "secondary",
  "accent",
  "muted",
  "border",
];

const paletteColors = Object.fromEntries(
  paletteKeys.map((key) => [key, cssVarColor(key)])
);
const semanticColors = Object.fromEntries(
  semanticKeys.map((key) => [key, cssVarColor(key)])
);

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.scss",
    "./scss/**/*.{scss,css}",
  ],
  theme: {
    extend: {
      colors: {
        ...paletteColors,
        ...semanticColors,
      },
    },
  },
  plugins: [],
};
