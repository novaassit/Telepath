import { Bot } from "grammy";
import { config } from "./config.js";
import { getHistory, addMessage, clearHistory } from "./history.js";
import { getLLMProvider } from "./llm/index.js";
import { fetchIPv4 } from "./fetch-ipv4.js";

const MAX_MESSAGE_LENGTH = 4096;

/** 유사 스트리밍: editMessageText 최소 간격 (ms) */
const STREAM_UPDATE_INTERVAL = 1000;

/** 안전한 분할 지점을 찾아 end 인덱스를 반환 */
function splitAtSafeBoundary(text: string, start: number): number {
  let end = Math.min(start + MAX_MESSAGE_LENGTH, text.length);
  if (end < text.length) {
    const chunk = text.slice(start, end);
    const lastNewline = chunk.lastIndexOf("\n");
    const lastSpace = chunk.lastIndexOf(" ");
    const safeBreak = Math.max(lastNewline, lastSpace);
    if (safeBreak > MAX_MESSAGE_LENGTH / 2) end = start + safeBreak + 1;
  }
  return end;
}

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

// allowFrom 필터: 목록이 비어있으면 모든 유저 허용, 있으면 목록에 있는 유저만 허용
if (config.allowFrom.length > 0) {
  bot.use((ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId || !config.allowFrom.includes(userId)) {
      console.log(`[차단] user_id=${userId} — allowFrom 목록에 없음`);
      return;
    }
    return next();
  });
  console.log(`[인증] allowFrom 활성화: ${config.allowFrom.join(", ")}`);
}

bot.command("start", (ctx) =>
  ctx.reply("안녕하세요! AI 챗봇입니다. 메시지를 보내주세요.")
);

bot.command("clear", (ctx) => {
  if (!ctx.from) return;
  clearHistory(ctx.from.id);
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

  if (userText.length > config.maxInputLength) {
    return ctx.reply(`메시지가 너무 깁니다. ${config.maxInputLength.toLocaleString()}자 이내로 보내주세요.`);
  }

  addMessage(userId, "user", userText);

  await ctx.api.sendChatAction(ctx.chat.id, "typing");

  // Keep sending typing indicator while waiting for response
  const typingInterval = setInterval(() => {
    ctx.api.sendChatAction(ctx.chat.id, "typing").catch(() => {});
  }, 4000);

  try {
    const history = getHistory(userId);
    const llm = getLLMProvider();

    if (config.streaming && llm.chatStream) {
      // 스트리밍 모드: editMessageText로 유사 스트리밍
      const placeholder = await ctx.reply("...");
      const msgId = placeholder.message_id;
      const chatId = ctx.chat.id;
      let fullText = "";
      let lastUpdate = 0;
      let lastSentText = "...";

      for await (const chunk of llm.chatStream(history)) {
        fullText += chunk;
        const now = Date.now();
        if (now - lastUpdate >= STREAM_UPDATE_INTERVAL) {
          const display = fullText.slice(0, MAX_MESSAGE_LENGTH) || "...";
          if (display !== lastSentText) {
            try {
              await ctx.api.editMessageText(chatId, msgId, display);
              lastSentText = display;
            } catch {
              // editMessageText 실패 시 무시 (내용 동일 등)
            }
          }
          lastUpdate = now;
        }
      }

      // 최종 업데이트
      let reply = fullText.trim();
      if (!reply) reply = "(응답이 비어 있었습니다. 다시 질문해 주세요.)";
      addMessage(userId, "assistant", reply);

      if (reply.length <= MAX_MESSAGE_LENGTH) {
        if (reply !== lastSentText) {
          try {
            await ctx.api.editMessageText(chatId, msgId, reply);
          } catch {
            // 내용 동일 시 무시
          }
        }
      } else {
        // 긴 응답: 첫 메시지 편집 후 나머지 분할 전송
        const firstChunk = splitAtSafeBoundary(reply, 0);
        try {
          await ctx.api.editMessageText(chatId, msgId, reply.slice(0, firstChunk));
        } catch {
          // ignore
        }
        let start = firstChunk;
        while (start < reply.length) {
          const end = splitAtSafeBoundary(reply, start);
          await ctx.reply(reply.slice(start, end));
          start = end;
        }
      }
    } else {
      // 기존 non-streaming 모드
      let reply = await llm.chat(history);
      if (typeof reply !== "string" || !reply.trim()) {
        reply = "(응답이 비어 있었습니다. 다시 질문해 주세요.)";
      }
      addMessage(userId, "assistant", reply);

      const toSend = reply.trim();
      if (toSend.length <= MAX_MESSAGE_LENGTH) {
        await ctx.reply(toSend);
      } else {
        let start = 0;
        while (start < toSend.length) {
          const end = splitAtSafeBoundary(toSend, start);
          await ctx.reply(toSend.slice(start, end));
          start = end;
        }
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
  const msg = err instanceof Error ? err.message : String(err);
  console.error("봇 오류:", msg);
});
