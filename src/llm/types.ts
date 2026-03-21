import type { Message } from "../history.js";

/** LLM 서비스 공통 인터페이스 */
export interface LLMProvider {
  /** 메시지 히스토리를 받아 응답 텍스트를 반환 */
  chat(messages: Message[]): Promise<string>;
  /** 스트리밍 모드: 청크 단위로 텍스트를 yield */
  chatStream?(messages: Message[]): AsyncGenerator<string, void, unknown>;
}

export type { Message };
