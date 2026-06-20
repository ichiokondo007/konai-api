// src/services/intent.service.ts
//
// ビジネスロジック層: ユーザー入力を LLM に投げ、intent JSON をパースし、
// dispatch(URL組み立て)まで行って返す。
// HTTP のことは知らない (route から呼ばれ、CLI 等からも再利用できる)。

import { llm } from "../llm.js";
import { config } from "../config.js";
import { buildMessages, extractJson } from "../domain/intent.js";
import { dispatch, type DispatchResult } from "../domain/dispatch.js";

export interface IntentResult {
  intent: string;
  parameters: Record<string, unknown>;
  dispatch: DispatchResult;
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
 * domain/intent.ts の検証済みプロンプトをそのまま使い、LLM の出力 JSON をパースする。
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

  const dispatchResult = await dispatch(parsed.intent, parsed.parameters ?? {});
  return {
    intent: parsed.intent,
    parameters: parsed.parameters ?? {},
    dispatch: dispatchResult,
  };
}
