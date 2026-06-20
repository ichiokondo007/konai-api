// src/domain/led.ts
//
// LED に関するドメインロジック。
// 色の解決 (resolveColor) をここに集約する。
// 将来「紫」「#FF8800」等の自由色に拡張する場合も、変更はこの関数の中だけで済む。

/** MVP: 4色のみ。LLM スキーマの enum と一致させること。 */
const COLOR_TABLE = {
  red: "red",
  green: "green",
  blue: "blue",
  white: "white",
} as const;

export type KnownColor = keyof typeof COLOR_TABLE;

/**
 * LLM が返した色名を Pico へ渡す色文字列に変換する。
 * - 既知の 4 色 → そのまま対応する値を返す
 * - null / 未知の値 → null(色指定なしとして扱う)
 */
export function resolveColor(color: string | null): string | null {
  if (color === null) return null;
  if (color in COLOR_TABLE) {
    return COLOR_TABLE[color as KnownColor];
  }
  // enum 外(LLM が想定外の色を返した場合)は null 扱いにして安全側に倒す。
  return null;
}
