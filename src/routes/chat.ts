import { Router, type Request, type Response } from "express";
import { llm } from "../llm.js";
import { config } from "../config.js";

export const chatRouter = Router();

interface ChatBody {
  messages?: { role: "system" | "user" | "assistant"; content: string }[];
  model?: string;
  stream?: boolean;
}

/**
 * POST /api/chat
 * Proxies a chat completion request to the local LLM.
 * Supports both a single JSON response and Server-Sent-Events streaming
 * (set `"stream": true` in the body).
 */
chatRouter.post("/chat", async (req: Request, res: Response) => {
  const { messages, model, stream } = req.body as ChatBody;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "`messages` must be a non-empty array" });
  }

  const useModel = model ?? config.llm.model;

  try {
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const completion = await llm.chat.completions.create({
        model: useModel,
        messages,
        stream: true,
      });

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const completion = await llm.chat.completions.create({
      model: useModel,
      messages,
    });

    return res.json({
      model: useModel,
      content: completion.choices[0]?.message?.content ?? "",
      usage: completion.usage,
    });
  } catch (err) {
    console.error("[chat] LLM request failed:", err);
    return res.status(502).json({
      error: "Failed to reach local LLM",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
