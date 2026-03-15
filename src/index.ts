import dns from "node:dns";
import { config } from "./config.js";
import { bot } from "./bot.js";

// IPv6 "No route to host" 환경에서 IPv4 우선 사용 (curl은 IPv4로 성공하는 경우)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const providerLabel =
  config.llm.provider === "ollama"
    ? `ollama/${config.llm.ollama?.model ?? "llama3"}`
    : config.llm.provider === "custom"
      ? `custom/${config.llm.custom?.model ?? "gpt-4o"}`
      : config.llm.provider === "claude"
        ? `claude/${config.llm.claude?.model ?? "claude-sonnet-4-6"}`
        : config.llm.provider === "gemini"
          ? `gemini/${config.llm.gemini?.model ?? "gemini-2.5-flash"}`
          : `${config.llm.provider}/${config.llm.openai?.model ?? "gpt-4o"}`;
console.log(`봇 시작 중... (LLM: ${providerLabel})`);

async function main() {
  try {
    const me = await bot.api.getMe();
    console.log("토큰 확인됨:", me.username);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && err.cause ? (err.cause instanceof Error ? err.cause.message : String(err.cause)) : "";
    console.error("연결 오류:", msg);
    if (cause) console.error("  원인:", cause);

    if (msg.includes("Network request") || msg.includes("fetch failed") || /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET/.test(msg + cause)) {
      console.error("\n같은 PC에서 아래 명령으로 연결 테스트:");
      console.error("  curl -v --connect-timeout 5 https://api.telegram.org");
      console.error("  → 실패하면: DNS 변경(예: 1.1.1.1) 또는 ISP에서 Telegram 차단 여부 확인.");
    } else {
      console.error("  TELEGRAM_BOT_TOKEN 값이 BotFather 발급 토큰과 같은지 확인하세요.");
    }
    process.exit(1);
  }

  bot.start({
    onStart: (info) => {
      console.log("봇이 실행 중입니다! (폴링 연결됨)", info?.username ?? "");
    },
  });
}

main().catch((err) => {
  console.error("시작 실패:", err);
  process.exit(1);
});

const shutdown = () => {
  console.log("\n봇을 종료합니다...");
  bot.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
