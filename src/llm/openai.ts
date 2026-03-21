import { config } from "../config.js";
import type { LLMProvider } from "./types.js";
import type { Message } from "../history.js";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChoice {
  message: { content: string };
}

interface OpenAIChatResponse {
  choices: OpenAIChoice[];
}

export function createOpenAIProvider(): LLMProvider {
  const apiKey = config.llm.openai?.apiKey;
  const baseUrl = config.llm.openai?.baseUrl?.replace(/\/$/, "") ?? null;
  const model = config.llm.openai?.model ?? "gpt-4o";

  if (!apiKey) {
    throw new Error(
      "OpenAI 연동 시 OPENAI_API_KEY 환경변수가 필요합니다. .env를 확인하세요."
    );
  }

  const url = baseUrl ? `${baseUrl}/chat/completions` : OPENAI_CHAT_URL;

  const commonHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  return {
    async chat(messages: Message[]): Promise<string> {
      const body: OpenAIMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: commonHeaders,
          body: JSON.stringify({ model, messages: body, stream: false }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (err) {
        throw new Error(
          `OpenAI 호환 API에 연결할 수 없습니다 (${url}). 네트워크를 확인하세요.`
        );
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI 호환 API 오류 (${res.status}): ${text}`);
      }

      const data = (await res.json()) as OpenAIChatResponse;
      const content = data.choices?.[0]?.message?.content;
      if (content == null) {
        throw new Error("OpenAI 호환 API 응답에 content가 없습니다.");
      }
      return content;
    },

    async *chatStream(messages: Message[]): AsyncGenerator<string, void, unknown> {
      const body: OpenAIMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: commonHeaders,
          body: JSON.stringify({ model, messages: body, stream: true }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (err) {
        throw new Error(
          `OpenAI 호환 API에 연결할 수 없습니다 (${url}). 네트워크를 확인하세요.`
        );
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI 호환 API 오류 (${res.status}): ${text}`);
      }

      yield* parseSSE(res);
    },
  };
}

/** OpenAI SSE 스트림 파싱 */
async function* parseSSE(res: Response): AsyncGenerator<string, void, unknown> {
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
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
