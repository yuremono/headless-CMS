/** 管理画面 composable フォーム共通 Tailwind（coding.md: oklch 変数 + TSX 直接記述） */

/** 暗背景向け: 半透明ステップ（GR70 等）は文字に使わず不透明トークンを使う */
export const adminTextMuted = 'text-GR';
export const adminTextMeta = 'text-xs text-GR';

export const adminFieldControl =
  'mt-2 w-full rounded-md border border-TC/25 px-4 py-2 text-sm  outline-none transition placeholder:text-GR focus:border-SC focus:ring-2 focus:ring-SC/30';

export const adminFieldControlTextarea = `${adminFieldControl} min-h-[8rem] mt-2`;

export const adminFieldControlCompact =
  'mt-2 w-full rounded-md border border-TC/25 px-3 py-2 text-sm  outline-none transition placeholder:text-GR focus:border-SC focus:ring-2 focus:ring-SC/30';

export const adminPanel = 'border border-TC/20';

export const adminPanelInset = "rounded-md border border-TC/20";

const adminBtnBase = 'rounded-full text-sm font-medium transition disabled:cursor-not-allowed';

export const adminBtnLg = `${adminBtnBase} px-5 py-3 border border-SC/50 bg-WH text-SC hover:bg-SC hover:text-WH disabled:opacity-60`;

export const adminBtnSm = `${adminBtnBase} px-4 py-2 border border-SC/50 bg-WH text-SC hover:bg-SC hover:text-WH disabled:opacity-60`;

export const adminBtnDanger = `${adminBtnBase} inline-flex items-center justify-center gap-1 px-4 py-2 border border-AC/50 bg-transparent text-SC hover:bg-AC/50`;

export const adminFormatBtn = 'rounded-md border border-TC/25 px-2 pt-0.5 text-xs text-GR transition hover:bg-TC10';

export const adminFormatBtnActive = 'rounded-md border border-SC/70 bg-SC/35 px-2 pt-0.5 text-xs';

export const adminBadgeRequired = 'rounded-full bg-SC/35 px-2 py-0.5 text-xs ';

export const adminBadgeSuccess = 'bg-WH/50 px-3 py-1 text-xs ';

export const adminTintInfo = "rounded-md border border-SC/40 bg-WH/50";
export const adminTintAccent = "rounded-md border border-SC/40 bg-SC/15";
