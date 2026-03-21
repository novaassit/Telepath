import { config } from "../config.js";
import type { LLMProvider } from "./types.js";
import type { Message } from "../history.js";

/** OpenAI 호환 API 요청/응답 타입 */
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatChoice {
  message: { content: string };
}

interface ChatResponse {
  choices: ChatChoice[];
}

/**
 * 커스텀 LLM 프로바이더 (OpenAI 호환 API).
 * Open WebUI, LiteLLM, vLLM 등 자체 호스팅/서드파티 OpenAI 호환 엔드포인트 연동용.
 */
export function createCustomProvider(): LLMProvider {
  const baseUrl = config.llm.custom?.baseUrl?.replace(/\/$/, "");
  const apiKey = config.llm.custom?.apiKey ?? "";
  const model = config.llm.custom?.model ?? "gpt-4o";

  if (!baseUrl) {
    throw new Error(
      "Custom LLM 연동 시 CUSTOM_LLM_BASE_URL 환경변수가 필요합니다. (OpenAI 호환 API 주소)"
    );
  }

  const url = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return {
    async chat(messages: Message[]): Promise<string> {
      const body: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ model, messages: body, stream: false }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (err) {
        throw new Error(
          `Custom LLM(OpenAI 호환)에 연결할 수 없습니다 (${url}). 네트워크를 확인하세요.`
        );
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Custom LLM 오류 (${res.status}): ${text}`);
      }

      const data = (await res.json()) as ChatResponse;
      const content = data.choices?.[0]?.message?.content;
      if (content == null) {
        throw new Error("Custom LLM 응답에 content가 없습니다.");
      }
      return content;
    },

    async *chatStream(messages: Message[]): AsyncGenerator<string, void, unknown> {
      const body: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ model, messages: body, stream: true }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (err) {
        throw new Error(
          `Custom LLM(OpenAI 호환)에 연결할 수 없습니다 (${url}). 네트워크를 확인하세요.`
        );
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Custom LLM 오류 (${res.status}): ${text}`);
      }

      yield* parseSSE(res);
    },
  };
}

/** OpenAI 호환 SSE 스트림 파싱 */
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
