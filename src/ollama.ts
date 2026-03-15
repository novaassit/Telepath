import { config } from "./config.js";
import type { Message } from "./history.js";

interface OllamaChatResponse {
  message: { role: string; content: string };
}

export async function chat(messages: Message[]): Promise<string> {
  const url = `${config.ollamaBaseUrl}/api/chat`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollamaModel,
        messages,
        stream: false,
      }),
    });
  } catch (err) {
    throw new Error(
      `Ollama 서버에 연결할 수 없습니다 (${config.ollamaBaseUrl}). Ollama가 실행 중인지 확인하세요.`
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama 오류 (${res.status}): ${body}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  return data.message.content;
}
