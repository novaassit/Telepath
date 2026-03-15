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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  return {
    async chat(messages: Message[]): Promise<string> {
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

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
  };
}
