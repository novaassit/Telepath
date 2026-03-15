import { config } from "./config.js";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const histories = new Map<number, Message[]>();

export function getHistory(userId: number): Message[] {
  if (!histories.has(userId)) {
    histories.set(userId, [{ role: "system", content: config.systemPrompt }]);
  }
  return histories.get(userId)!;
}

export function addMessage(userId: number, role: "user" | "assistant", content: string): void {
  const history = getHistory(userId);
  history.push({ role, content });

  // Keep system prompt + trim oldest user/assistant pairs when exceeding limit
  // +1 for the system prompt
  while (history.length > config.maxHistoryMessages + 1) {
    history.splice(1, 2); // Remove oldest user+assistant pair after system prompt
  }
}

export function clearHistory(userId: number): void {
  histories.delete(userId);
}
