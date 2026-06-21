// src/services/chat.service.ts
//
// 雑談(LED制御以外)の応答を生成するサービス。
// intent が unknown だったときの 2-pass 目で使われる。
// LED の intent 分類(intent.service.ts)とは独立。

import { llm } from "../llm.js";
import { config } from "../config.js";
import { buildChatMessages } from "../domain/chat.js";

/**
 * 自然文に対する雑談応答を生成して返す。
 * /no_think 付与済みだが、念のため <think> 除去も通して安全側に倒す。
 */
export async function generateChatReply(userInput: string): Promise<string> {
  const completion = await llm.chat.completions.create({
    model: config.llm.model,
    messages: buildChatMessages(userInput),
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  // 雑談は自然文。<think></think> が前置されるケースに備えて除去だけ行う。
  // (JSON ではないので JSON.parse はしない)
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return cleaned;
}
