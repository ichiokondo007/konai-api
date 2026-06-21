// src/services/intent.service.ts
//
// ビジネスロジック層: ユーザー入力を LLM に投げ、intent JSON をパースし、
// led_control なら dispatch(LED操作)、unknown なら雑談応答(2-pass目)を行う。
// HTTP のことは知らない (route から呼ばれ、CLI 等からも再利用できる)。

import { llm } from "../llm.js";
import { config } from "../config.js";
import { buildMessages, extractJson } from "../domain/intent.js";
import { dispatch, type DispatchResult } from "../domain/dispatch.js";
import { generateChatReply } from "./chat.service.js";

export interface IntentResult {
  intent: string;
  parameters: Record<string, unknown>;
  dispatch: DispatchResult;
  /** unknown のときの雑談応答。led_control のときは null。 */
  reply: string | null;
}

/** LLM の出力が JSON として解釈できなかった場合に投げる。 */
export class IntentParseError extends Error {
  constructor(public readonly raw: string) {
    super("LLM did not return valid JSON");
    this.name = "IntentParseError";
  }
}

/**
 * ユーザー入力を intent スキーマに沿って解釈する。
 * - led_control → Pico へ dispatch
 * - unknown     → 雑談応答を生成(2-pass)
 */
export async function parseIntent(userInput: string): Promise<IntentResult> {
  const completion = await llm.chat.completions.create({
    model: config.llm.model,
    messages: buildMessages(userInput),
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  let parsed: { intent: string; parameters: Record<string, unknown> };
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new IntentParseError(raw);
  }

  const parameters = parsed.parameters ?? {};
  const dispatchResult = await dispatch(parsed.intent, parameters);

  // unknown のときだけ 2-pass 目(雑談応答)を呼ぶ。
  let reply: string | null = null;
  if (parsed.intent === "unknown") {
    reply = await generateChatReply(userInput);
  }

  return {
    intent: parsed.intent,
    parameters,
    dispatch: dispatchResult,
    reply,
  };
}
