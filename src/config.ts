import "dotenv/config";

interface Config {
  telegramBotToken: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  systemPrompt: string;
  maxHistoryMessages: number;
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.");
}

export const config: Config = {
  telegramBotToken: token,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3",
  systemPrompt: process.env.SYSTEM_PROMPT || "You are a helpful assistant.",
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES) || 20,
};
