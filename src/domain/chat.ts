// src/domain/chat.ts
//
// 雑談(LED制御以外)用のプロンプト。
// intent 分類で unknown が返ったときの 2-pass 目で使う。
// LED 分類プロンプト(domain/intent.ts)とは完全に別物。JSON 制約は持たない。

// ⚠️ /no_think はフェーズ1の知見どおり付与し、think ブロック混入を防ぐ。
export const CHAT_SYSTEM_PROMPT = `あなたは親切な日本語アシスタントです。
ユーザーの質問やメッセージに、自然な日本語で簡潔に答えてください。

/no_think`;

export function buildChatMessages(userInput: string) {
  return [
    { role: "system" as const, content: CHAT_SYSTEM_PROMPT },
    { role: "user" as const, content: userInput },
  ];
}
