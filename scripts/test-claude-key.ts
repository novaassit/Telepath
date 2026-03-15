/**
 * .env의 Claude API 키가 유효한지 확인합니다.
 * 실행: npx tsx scripts/test-claude-key.ts
 */
import "dotenv/config";

const apiKey = (process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");

if (!apiKey) {
  console.error("❌ ANTHROPIC_API_KEY 또는 CLAUDE_API_KEY가 .env에 없습니다.");
  process.exit(1);
}

console.log("키 길이:", apiKey.length, "| 앞 15자:", apiKey.slice(0, 15) + "...");
console.log("API 호출 중...");

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 32,
    messages: [{ role: "user", content: "Say OK in one word." }],
  }),
});

const text = await res.text();

if (res.ok) {
  console.log("✅ 키가 정상입니다. Claude API 호출 성공.");
} else {
  console.error("❌ API 오류:", res.status, text);
  if (res.status === 401) {
    console.error("\n→ 키를 https://console.anthropic.com/settings/keys 에서 새로 발급해 .env에 넣고 다시 실행하세요.");
  }
  process.exit(1);
}
