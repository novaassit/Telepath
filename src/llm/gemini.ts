import { config } from "../config.js";
import type { LLMProvider } from "./types.js";
import type { Message } from "../history.js";

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

/**
 * Gemini (Google AI) 프로바이더.
 * 모델 예: gemini-2.5-flash, gemini-2.5-pro, gemini-3-flash-preview 등
 */
export function createGeminiProvider(): LLMProvider {
  const apiKey = config.llm.gemini?.apiKey;
  const model = config.llm.gemini?.model ?? "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error(
      "Gemini 연동 시 GEMINI_API_KEY 환경변수가 필요합니다."
    );
  }

  const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

  const commonHeaders = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };

  function buildBody(messages: Message[]) {
    let systemInstruction: string | undefined;
    const contents: GeminiContent[] = [];

    for (const m of messages) {
      if (m.role === "system") {
        systemInstruction = m.content;
      } else {
        const role = m.role === "assistant" ? "model" : "user";
        contents.push({
          role,
          parts: [{ text: m.content }],
        });
      }
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: config.llm.gemini?.maxTokens ?? 8192,
      },
    };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    return body;
  }

  return {
    async chat(messages: Message[]): Promise<string> {
      const body = buildBody(messages);

      let res: Response;
      try {
        res = await fetch(generateUrl, {
          method: "POST",
          headers: commonHeaders,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (err) {
        throw new Error(
          `Gemini API에 연결할 수 없습니다. 네트워크를 확인하세요.`
        );
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini API 오류 (${res.status}): ${text}`);
      }

      const data = (await res.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text == null) {
        throw new Error("Gemini API 응답에 텍스트가 없습니다.");
      }
      return text.trim();
    },

    async *chatStream(messages: Message[]): AsyncGenerator<string, void, unknown> {
      const body = buildBody(messages);

      let res: Response;
      try {
        res = await fetch(streamUrl, {
          method: "POST",
          headers: commonHeaders,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (err) {
        throw new Error(
          `Gemini API에 연결할 수 없습니다. 네트워크를 확인하세요.`
        );
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini API 오류 (${res.status}): ${text}`);
      }

      // Gemini SSE: data: {"candidates":[{"content":{"parts":[{"text":"..."}]}}]}
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
            try {
              const parsed = JSON.parse(data) as GeminiResponse;
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) yield text;
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
