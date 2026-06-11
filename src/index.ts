import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { chatRouter } from "./routes/chat.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", llm: config.llm.baseURL, model: config.llm.model });
});

// LLM routes
app.use("/api", chatRouter);

app.listen(config.port, () => {
  console.log(`konai-api listening on http://localhost:${config.port}`);
  console.log(`-> proxying LLM at ${config.llm.baseURL} (model: ${config.llm.model})`);
});
