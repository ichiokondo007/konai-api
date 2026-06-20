// src/domain/intent.ts

// ⚠️ この文字列はステップ1のcurlで3分岐すべて検証済み。
// 安易に整形・言い換えしないこと(構造化出力が崩れる)。
export const LED_SYSTEM_PROMPT = `You are an intent parser for an LED controller.
Output ONLY a single JSON object. No markdown, no code fences, no explanation.

Schema:
{"intent":"led_control"|"unknown","parameters":{"power":"on"|"off","color":"red"|"green"|"blue"|"white"|null}}

Rules:
- LEDの点灯/消灯/色変更の要求なら intent="led_control"。
- power="off" のときは color=null。
- 対象外・意味不明なら intent="unknown", parameters={}。

Examples:
User: 赤色に光らせて
{"intent":"led_control","parameters":{"power":"on","color":"red"}}
User: LED消して
{"intent":"led_control","parameters":{"power":"off","color":null}}
User: 今日の天気は?
{"intent":"unknown","parameters":{}}

/no_think`;

export function buildMessages(userInput: string) {
  return [
    { role: "system" as const, content: LED_SYSTEM_PROMPT },
    { role: "user" as const, content: userInput },
  ];
}
/**
 * LLM 出力から JSON 本体を取り出す。
 * Qwen3 + /no_think は `<think></think>\n\n{...}` を返すため、
 * そのままでは JSON.parse できない。think ブロックを除去して本体を抽出する。
 */
export function extractJson(raw: string): string {
  const withoutThink = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const start = withoutThink.indexOf("{");
  const end = withoutThink.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    return withoutThink;
  }
  return withoutThink.slice(start, end + 1);
}
