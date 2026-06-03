/** scss/_01variables.scss の CSS 変数 → bg-MC, text-GR, bg-background 等（/NN 透明度対応） */
/** opacityValue 関数は @apply 等で非数値が渡り NaN% になるため、<alpha-value> 文字列形式を使う */
const cssVarColorWithAlpha = (varName) =>
  `color-mix(in oklch, var(--${varName}) calc(<alpha-value> * 100%), transparent)`;

const cssVarColorFixed = (varName) => `var(--${varName})`;

const buildAlphaColors = (keys) =>
  Object.fromEntries(keys.map((key) => [key, cssVarColorWithAlpha(key)]));

const buildFixedColors = (keys) =>
  Object.fromEntries(keys.map((key) => [key, cssVarColorFixed(key)]));

/** oklch パレット（--MC, --GR 等） */
const paletteBase = ["MC", "SC", "AC", "BC", "TC", "GR", "BK", "WH"];

/** SCSS @for で生成される不透明度ステップ（--GR10, --MC20 等）— 固定 var のみ */
const opacitySteps = ["10", "20", "30", "40", "50", "60", "70", "80", "90"];
const paletteOpacityKeys = paletteBase.flatMap((base) =>
  opacitySteps.map((step) => `${base}${step}`),
);
paletteOpacityKeys.push("MC05");

/** セマンティック名（--background, --primary 等） */
const semanticKeys = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
  "muted",
  "border",
  "surface",
  "neutral",
  "second",
  "third",
  "fourth",
];

/** ユーティリティ色（--TR, --CC 等） */
const utilityColorKeys = ["TR", "UN", "IN", "CC"];

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ...buildAlphaColors(paletteBase),
        ...buildFixedColors(paletteOpacityKeys),
        ...buildAlphaColors(semanticKeys),
        ...buildFixedColors(utilityColorKeys),
      },
    },
  },
  plugins: [],
};
