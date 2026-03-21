import { config } from "../config.js";
import type { LLMProvider } from "./types.js";
import type { Message } from "../history.js";

interface OllamaChatResponse {
  message: { role: string; content: string };
}

export function createOllamaProvider(): LLMProvider {
  const baseUrl = config.llm.ollama?.baseUrl ?? "http://localhost:11434";
  const model = config.llm.ollama?.model ?? "llama3";

  const url = `${baseUrl}/api/chat`;

  return {
    async chat(messages: Message[]): Promise<string> {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages, stream: false }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (err) {
        throw new Error(
          `Ollama 서버에 연결할 수 없습니다 (${baseUrl}). Ollama가 실행 중인지 확인하세요.`
        );
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Ollama 오류 (${res.status}): ${body}`);
      }
      const data = (await res.json()) as OllamaChatResponse;
      const content = data?.message?.content;
      if (content == null) {
        throw new Error("Ollama 응답에 content가 없습니다.");
      }
      return content;
    },

    async *chatStream(messages: Message[]): AsyncGenerator<string, void, unknown> {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages, stream: true }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (err) {
        throw new Error(
          `Ollama 서버에 연결할 수 없습니다 (${baseUrl}). Ollama가 실행 중인지 확인하세요.`
        );
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Ollama 오류 (${res.status}): ${body}`);
      }

      // Ollama: NDJSON (한 줄씩 JSON), {"message":{"content":"..."}}
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop()!;

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              const content = parsed.message?.content;
              if (content) yield content;
            } catch {
              // skip malformed JSON
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
