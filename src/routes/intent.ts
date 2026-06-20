// src/routes/intent.ts
//
// HTTP 層 (controller): req のバリデーションと res の返却のみ。
// LLM 呼び出しや JSON パースは services/intent.service.ts に委譲する。

import { Router, type Request, type Response } from "express";
import { parseIntent, IntentParseError } from "../services/intent.service.js";

export const intentRouter = Router();

interface IntentBody {
  input?: string;
}

/**
 * POST /api/intent
 * ユーザーの自然文入力 (`input`) を intent スキーマに沿って解釈し、
 * {intent, parameters} を返す。
 */
intentRouter.post("/intent", async (req: Request, res: Response) => {
  const { input } = req.body as IntentBody;

  if (typeof input !== "string" || input.trim() === "") {
    return res.status(400).json({ error: "`input` must be a non-empty string" });
  }

  try {
    const result = await parseIntent(input);
    return res.json(result);
  } catch (err) {
    if (err instanceof IntentParseError) {
      console.error("[intent] non-JSON LLM output:", err.raw);
      return res.status(502).json({ error: "LLM returned invalid JSON", raw: err.raw });
    }
    console.error("[intent] LLM request failed:", err);
    return res.status(502).json({
      error: "Failed to reach local LLM",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
