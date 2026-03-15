import { Bot } from "grammy";
import { config } from "./config.js";
import { getHistory, addMessage, clearHistory } from "./history.js";
import { getLLMProvider } from "./llm/index.js";
import { fetchIPv4 } from "./fetch-ipv4.js";

const MAX_MESSAGE_LENGTH = 4096;

export const bot = new Bot(config.telegramBotToken, {
  client: {
    fetch: fetchIPv4 as typeof fetch,
  },
});

// 업데이트 수신 여부 확인용 (웹훅이 있으면 이 로그가 안 찍힘)
bot.use((ctx, next) => {
  const kind = ctx.message?.text ? "텍스트" : ctx.message ? "메시지(비텍스트)" : "업데이트";
  console.log(`[업데이트 수신] ${kind}`);
  return next();
});

bot.command("start", (ctx) =>
  ctx.reply("안녕하세요! AI 챗봇입니다. 메시지를 보내주세요.")
);

bot.command("clear", (ctx) => {
  clearHistory(ctx.from!.id);
  return ctx.reply("대화 히스토리가 초기화되었습니다.");
});

// 텍스트가 아닌 메시지(사진, 스티커 등) 안내. 텍스트면 next()로 message:text 핸들러가 실행되도록 함
bot.on("message", async (ctx, next) => {
  if (!ctx.message.text) {
    return ctx.reply("텍스트로 메시지를 보내주세요.");
  }
  await next();
});

bot.on("message:text", async (ctx) => {
  console.log(`[수신] chat_id=${ctx.chat.id} 텍스트 길이=${ctx.message.text?.length ?? 0}`);
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
    const llm = getLLMProvider();
    let reply = await llm.chat(history);
    if (typeof reply !== "string" || !reply.trim()) {
      reply = "(응답이 비어 있었습니다. 다시 질문해 주세요.)";
    }
    addMessage(userId, "assistant", reply);

    // Split long messages (Telegram 4096자 제한). 문장/단어 중간에서 잘리지 않도록 구간 나눔
    const toSend = reply.trim();
    if (toSend.length <= MAX_MESSAGE_LENGTH) {
      await ctx.reply(toSend);
    } else {
      let start = 0;
      while (start < toSend.length) {
        let end = Math.min(start + MAX_MESSAGE_LENGTH, toSend.length);
        if (end < toSend.length) {
          const chunk = toSend.slice(start, end);
          const lastNewline = chunk.lastIndexOf("\n");
          const lastSpace = chunk.lastIndexOf(" ");
          const safeBreak = Math.max(lastNewline, lastSpace);
          if (safeBreak > MAX_MESSAGE_LENGTH / 2) end = start + safeBreak + 1;
        }
        await ctx.reply(toSend.slice(start, end));
        start = end;
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    console.error("LLM 호출 실패:", errorMsg);
    await ctx.reply(`오류: ${errorMsg}`);
  } finally {
    clearInterval(typingInterval);
  }
});

bot.catch((err) => {
  console.error("봇 오류:", err.message);
});
