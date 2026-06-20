// src/domain/dispatch.ts
//
// intent の解釈結果 ({intent, parameters}) を、実機 (Pico/kd1-controller) への
// 操作に変換し、実際に HTTP GET を送る層。

import { config } from "../config.js";
import { resolveColor } from "./led.js";

export interface DispatchResult {
  /** 実際に叩いた URL(led_control 以外は null) */
  url: string | null;
  /** 何をしたか(UI 表示やログ用の人間可読メッセージ) */
  message: string;
  /** Pico への送信が成功したか(led_control 以外は null) */
  ok: boolean | null;
  /** Pico からの応答本文(成功時のみ。失敗・対象外は null) */
  response: string | null;
}

/**
 * led_control の parameters から Pico へ送る URL を組み立てる。
 * - power=on  → ?device=led&power=on&color=<解決後の色>
 * - power=off → ?device=led&power=off  (color は付けない)
 */
function buildLedUrl(parameters: Record<string, unknown>): string {
  const base = `${config.pico.baseURL}/kd1-controller`;
  const power = parameters.power === "off" ? "off" : "on";

  if (power === "off") {
    return `${base}?device=led&power=off`;
  }

  const color = resolveColor((parameters.color as string | null) ?? null);
  const colorPart = color ? `&color=${color}` : "";
  return `${base}?device=led&power=on${colorPart}`;
}

/**
 * intent をディスパッチする。
 * led_control なら Pico へ実際に HTTP GET を送る。
 */
export async function dispatch(
  intent: string,
  parameters: Record<string, unknown>,
): Promise<DispatchResult> {
  if (intent !== "led_control") {
    console.log(`[dispatch] no action for intent="${intent}"`);
    return {
      url: null,
      message: `操作対象外の intent です: ${intent}`,
      ok: null,
      response: null,
    };
  }

  const url = buildLedUrl(parameters);

  try {
    const res = await fetch(url);
    const body = await res.text();
    console.log(`[dispatch] GET ${url} -> ${res.status} ${body}`);
    return {
      url,
      message: `Pico へ送信しました (${res.status})`,
      ok: res.ok,
      response: body,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[dispatch] GET ${url} failed: ${detail}`);
    return {
      url,
      message: `Pico への送信に失敗しました: ${detail}`,
      ok: false,
      response: null,
    };
  }
}
