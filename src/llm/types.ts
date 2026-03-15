import type { Message } from "../history.js";

/** LLM 서비스 공통 인터페이스 */
export interface LLMProvider {
  /** 메시지 히스토리를 받아 응답 텍스트를 반환 */
  chat(messages: Message[]): Promise<string>;
}

export type { Message };
