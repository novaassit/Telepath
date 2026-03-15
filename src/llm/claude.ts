import { config } from "../config.js";
import type { LLMProvider } from "./types.js";
import type { Message } from "../history.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  stop_reason?: string;
}

/**
 * Claude (Anthropic) 프로바이더.
 * 모델 예: claude-sonnet-4-6, claude-opus-4-6, claude-code 등
 */
export function createClaudeProvider(): LLMProvider {
  const rawKey = config.llm.claude?.apiKey ?? "";
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, ""); // 앞뒤 공백·따옴표 제거
  const model = config.llm.claude?.model ?? "claude-sonnet-4-6";
  const maxTokens = config.llm.claude?.maxTokens ?? 8192;

  if (!apiKey) {
    throw new Error(
      "Claude 연동 시 ANTHROPIC_API_KEY(또는 CLAUDE_API_KEY) 환경변수가 필요합니다."
    );
  }

  return {
    async chat(messages: Message[]): Promise<string> {
      let system: string | undefined;
      const apiMessages: AnthropicMessage[] = [];

      for (const m of messages) {
        if (m.role === "system") {
          system = m.content;
        } else {
          apiMessages.push({
            role: m.role as "user" | "assistant",
            content: m.content,
          });
        }
      }

      const body: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        messages: apiMessages,
      };
      if (system) body.system = system;

      let res: Response;
      try {
        res = await fetch(ANTHROPIC_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
        });
      } catch (err) {
        throw new Error(
          `Claude API에 연결할 수 없습니다. 네트워크를 확인하세요.`
        );
      }

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401) {
          throw new Error(
            "Claude API 인증 실패 (401). 다음을 확인하세요: (1) .env에 ANTHROPIC_API_KEY 또는 CLAUDE_API_KEY 한 줄만 설정 (2) 따옴표 없이 키만 입력 (3) 키는 https://console.anthropic.com/ → API Keys에서 발급 (4) 봇 재시작"
          );
        }
        throw new Error(`Claude API 오류 (${res.status}): ${text}`);
      }

      const data = (await res.json()) as AnthropicResponse;
      const parts = (data.content ?? [])
        .filter((b): b is AnthropicContentBlock & { text: string } => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text);
      const content = parts.join("").trim();
      if (!content) {
        throw new Error("Claude API 응답에 텍스트가 없습니다.");
      }
      return content;
    },
  };
}
