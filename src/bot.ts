import { Bot } from "grammy";
import { config } from "./config.js";
import { getHistory, addMessage, clearHistory } from "./history.js";
import { chat } from "./ollama.js";

const MAX_MESSAGE_LENGTH = 4096;

export const bot = new Bot(config.telegramBotToken);

bot.command("start", (ctx) =>
  ctx.reply("안녕하세요! 저는 Ollama 기반 AI 챗봇입니다. 메시지를 보내주세요.")
);

bot.command("clear", (ctx) => {
  clearHistory(ctx.from!.id);
  return ctx.reply("대화 히스토리가 초기화되었습니다.");
});

bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id;
  const userText = ctx.message.text;

  addMessage(userId, "user", userText);

  await ctx.api.sendChatAction(ctx.chat.id, "typing");

  // Keep sending typing indicator while waiting for response
  const typingInterval = setInterval(() => {
    ctx.api.sendChatAction(ctx.chat.id, "typing").catch(() => {});
  }, 4000);

  try {
    const history = getHistory(userId);
    const reply = await chat(history);
    addMessage(userId, "assistant", reply);

    // Split long messages
    if (reply.length <= MAX_MESSAGE_LENGTH) {
      await ctx.reply(reply);
    } else {
      for (let i = 0; i < reply.length; i += MAX_MESSAGE_LENGTH) {
        await ctx.reply(reply.slice(i, i + MAX_MESSAGE_LENGTH));
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    console.error("Ollama 호출 실패:", errorMsg);
    await ctx.reply(`오류: ${errorMsg}`);
  } finally {
    clearInterval(typingInterval);
  }
});

bot.catch((err) => {
  console.error("봇 오류:", err.message);
});
