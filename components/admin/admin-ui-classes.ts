/** 管理画面 composable フォーム共通 Tailwind（coding.md: oklch 変数 + TSX 直接記述） */

/** 暗背景向け: 半透明ステップ（GR70 等）は文字に使わず不透明トークンを使う */
export const adminTextMuted = 'text-GR';
export const adminTextMeta = 'text-xs text-GR';

export const adminFieldControl =
  'w-full rounded-md border border-WH/25 bg-BC/50 px-4 py-2 text-sm  outline-none transition placeholder:text-GR focus:border-SC focus:ring-2 focus:ring-SC/30';

export const adminFieldControlTextarea = `${adminFieldControl} min-h-[8rem] mt-2`;

export const adminFieldControlCompact =
  'mt-2 w-full rounded-md border border-WH/25 bg-BC/50 px-3 py-2 text-sm  outline-none transition placeholder:text-GR focus:border-SC focus:ring-2 focus:ring-SC/30';

export const adminPanel =
  ' border border-WH/20  ';

export const adminPanelInset = "rounded-md border border-WH/20 bg-BK/60";

export const adminBtn =
  'rounded-full text-sm font-medium transition disabled:cursor-not-allowed';

export const adminBtnPrimary = `${adminBtn} border border-SC/60 bg-SC/30 px-5 py-3  hover:bg-SC/50 disabled:opacity-60`;

export const adminBtnPublish = `${adminBtn} bg-WH/70 px-5 py-3 text-BK hover:bg-WH disabled:opacity-60`;

export const adminBtnAction = `${adminBtn} bg-SC px-5 py-3  hover:bg-SC80 disabled:opacity-50`;

export const adminBtnGhost = `${adminBtn} border border-WH/25 px-5 py-3  hover:bg-WH/10`;

export const adminBtnGhostSm = `${adminBtn} border border-WH/25 px-4 py-2  hover:bg-WH/10`;

export const adminBtnSkySm = `${adminBtn} border border-SC/60 bg-SC/30 px-4 py-2  hover:bg-SC/50`;

export const adminBtnDangerSm = `${adminBtn} border border-AC/50 bg-AC/10 px-4 py-2 hover:bg-AC/50`;

export const adminBtnDangerXs = `${adminBtn} border border-AC/50 bg-AC/10 px-3 py-1 text-xs text-BK hover:bg-AC/50`;

export const adminBtnEmeraldSm = `${adminBtn} border border-SC/60 bg-WH/30 px-4 py-2 text-BK hover:bg-SC/50`;

export const adminBtnViolet = `${adminBtn} bg-WH px-5 py-3 text-BK hover:bg-WH90`;

export const adminBtnVioletXs = `${adminBtn} border border-SC/60 bg-SC/30 px-3 py-1 text-xs  hover:bg-SC/50`;

export const adminFormatBtn =
	"rounded-md border border-WH/25 px-2 py-0.5 text-xs text-GR transition  hover:bg-TC10 ";

export const adminFormatBtnActive =
  'rounded-md border border-SC/70 bg-SC/35 px-2 py-0.5 text-xs ';

export const adminBadgeRequired = 'rounded-full bg-SC/35 px-2 py-0.5 text-xs ';

export const adminBadgeSuccess =
  'rounded-full border border-SC/60 bg-SC/30 px-3 py-1 text-xs ';

export const adminTintInfo = "rounded-md border border-SC/40 bg-SC/10";
export const adminTintAccent = "rounded-md border border-SC/40 bg-SC/15";
