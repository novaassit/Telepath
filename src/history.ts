import { config } from "./config.js";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface HistoryEntry {
  messages: Message[];
  lastAccess: number;
}

const histories = new Map<number, HistoryEntry>();

// 30분 동안 접근 없는 히스토리 정리
const HISTORY_TTL_MS = 30 * 60 * 1000;

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of histories) {
    if (now - entry.lastAccess > HISTORY_TTL_MS) {
      histories.delete(userId);
    }
  }
}, 5 * 60 * 1000); // 5분마다 체크

// 프로세스 종료 시 타이머 정리
cleanupInterval.unref();

export function getHistory(userId: number): Message[] {
  const entry = histories.get(userId);
  if (entry) {
    entry.lastAccess = Date.now();
    return entry.messages;
  }
  const messages: Message[] = [{ role: "system", content: config.systemPrompt }];
  histories.set(userId, { messages, lastAccess: Date.now() });
  return messages;
}

export function addMessage(userId: number, role: "user" | "assistant", content: string): void {
  const history = getHistory(userId);
  history.push({ role, content });

  // 시스템 프롬프트(index 0) 유지 + 최신 maxHistoryMessages개만 보존
  const max = config.maxHistoryMessages;
  if (history.length > max + 1) {
    const trimmed = [history[0], ...history.slice(-(max))];
    history.length = 0;
    history.push(...trimmed);
  }
}

export function clearHistory(userId: number): void {
  histories.delete(userId);
}
