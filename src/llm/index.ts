import { config } from "../config.js";
import type { LLMProvider } from "./types.js";
import { createOllamaProvider } from "./ollama.js";
import { createOpenAIProvider } from "./openai.js";
import { createCustomProvider } from "./custom.js";
import { createClaudeProvider } from "./claude.js";
import { createGeminiProvider } from "./gemini.js";

export type { LLMProvider, Message } from "./types.js";

let cachedProvider: LLMProvider | null = null;

/** 설정된 LLM 프로바이더 인스턴스를 반환 (싱글톤) */
export function getLLMProvider(): LLMProvider {
  if (!cachedProvider) {
    switch (config.llm.provider) {
      case "ollama":
        cachedProvider = createOllamaProvider();
        break;
      case "openai":
        cachedProvider = createOpenAIProvider();
        break;
      case "custom":
        cachedProvider = createCustomProvider();
        break;
      case "claude":
        cachedProvider = createClaudeProvider();
        break;
      case "gemini":
        cachedProvider = createGeminiProvider();
        break;
      default:
        throw new Error(
          `지원하지 않는 LLM 프로바이더: ${config.llm.provider}.`
        );
    }
  }
  return cachedProvider;
}
