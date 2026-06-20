// src/services/intent.service.ts
//
// ビジネスロジック層: ユーザー入力を LLM に投げ、intent JSON をパースして返す。
// HTTP のことは知らない (route から呼ばれ、CLI 等からも再利用できる)。

import { llm } from "../llm.js";
import { config } from "../config.js";
import { buildMessages, extractJson } from "../domain/intent.js";

export interface IntentResult {
  intent: string;
  parameters: Record<string, unknown>;
}

/**
 * ユーザー入力を intent スキーマに沿って解釈する。
 * domain/intent.ts の検証済みプロンプトをそのまま使い、LLM の出力 JSON をパースする。
 */
export async function parseIntent(userInput: string): Promise<IntentResult> {
  const completion = await llm.chat.completions.create({
    model: config.llm.model,
    messages: buildMessages(userInput),
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  try {
    return JSON.parse(extractJson(raw)) as IntentResult;
  } catch {
    throw new IntentParseError(raw);
  }
}

/** LLM の出力が JSON として解釈できなかった場合に投げる。 */
export class IntentParseError extends Error {
  constructor(public readonly raw: string) {
    super("LLM did not return valid JSON");
    this.name = "IntentParseError";
  }
}
