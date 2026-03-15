import { config } from "./config.js";
import { bot } from "./bot.js";

console.log(`봇 시작 중... (모델: ${config.ollamaModel})`);

bot.start({
  onStart: () => console.log("봇이 실행 중입니다!"),
});

const shutdown = () => {
  console.log("\n봇을 종료합니다...");
  bot.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
