import OpenAI from "openai";
import { config } from "./config.js";

/**
 * OpenAI SDK client pointed at the local axllm endpoint.
 * Because axllm is OpenAI-compatible, the standard SDK works as-is by
 * overriding baseURL.
 */
export const llm = new OpenAI({
  baseURL: config.llm.baseURL,
  apiKey: config.llm.apiKey,
});
