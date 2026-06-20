import "dotenv/config";

/**
 * Centralized environment configuration.
 * The local LLM (axllm serve / Qwen on AX8850) exposes an OpenAI-compatible API.
 */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  /**
   * skynet llm ( local llm quen3-1.7b)
   */
  llm: {
    // Base URL of the local OpenAI-compatible endpoint exposed by `axllm serve`.
    // axllm typically serves on the Raspberry Pi 5's address, e.g. http://raspi5.local:8000/v1
    baseURL: process.env.LLM_BASE_URL ?? "http://10.20.10.4:8000/v1",
    // Local servers usually ignore the key, but the SDK requires a non-empty string.
    apiKey: process.env.LLM_API_KEY ?? "not-needed",
    // Default model id (e.g. the Qwen axmodel name registered in axllm).
    model: process.env.LLM_MODEL ?? "qwen",
  },
} as const;
