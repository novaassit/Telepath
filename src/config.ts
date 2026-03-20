import "dotenv/config";

export type LLMProviderType = "ollama" | "openai" | "custom" | "claude" | "gemini";

interface Config {
  telegramBotToken: string;
  systemPrompt: string;
  maxHistoryMessages: number;
  maxInputLength: number;
  allowFrom: number[];
  llm: {
    provider: LLMProviderType;
    ollama?: { baseUrl: string; model: string };
    openai?: { apiKey: string; baseUrl?: string; model: string };
    custom?: { baseUrl: string; apiKey: string; model: string };
    claude?: { apiKey: string; model: string; maxTokens?: number };
    gemini?: { apiKey: string; model: string; maxTokens?: number };
  };
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.");
}

const allowed: LLMProviderType[] = ["ollama", "openai", "custom", "claude", "gemini"];
const provider = (process.env.LLM_PROVIDER || "ollama").toLowerCase() as LLMProviderType;
if (!allowed.includes(provider)) {
  throw new Error(`LLM_PROVIDER는 ${allowed.join(", ")} 중 하나여야 합니다.`);
}

export const config: Config = {
  telegramBotToken: token,
  systemPrompt: process.env.SYSTEM_PROMPT || "You are a helpful assistant.",
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES) || 20,
  maxInputLength: Number(process.env.MAX_INPUT_LENGTH) || 10000,
  allowFrom: (process.env.ALLOW_FROM ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n)),
  llm: {
    provider,
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "llama3.2",
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY ?? "",
      baseUrl: process.env.OPENAI_BASE_URL || undefined,
      model: process.env.OPENAI_MODEL || "gpt-4o",
    },
    custom: {
      baseUrl: process.env.CUSTOM_LLM_BASE_URL ?? "",
      apiKey: process.env.CUSTOM_LLM_API_KEY ?? "",
      model: process.env.CUSTOM_LLM_MODEL || "gpt-4o",
    },
    claude: {
      apiKey: (process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY ?? "").trim(),
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
      maxTokens: Number(process.env.CLAUDE_MAX_TOKENS) || 8192,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? "",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      maxTokens: Number(process.env.GEMINI_MAX_TOKENS) || 8192,
    },
  },
};
