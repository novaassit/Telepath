/**
 * 같은 봇에 설정된 웹훅을 삭제합니다.
 * 폴링으로 메시지를 받지 못할 때 실행하세요: npm run webhook:delete
 */
import "dotenv/config";
import { fetchIPv4 } from "../src/fetch-ipv4.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN이 .env에 없습니다.");
  process.exit(1);
}

const url = `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`;

const res = await fetchIPv4(url);
const data = (await res.json()) as { ok: boolean; description?: string };

if (data.ok) {
  console.log("웹훅이 삭제되었습니다. 이제 npm run dev로 봇을 다시 실행하세요.");
} else {
  console.error("웹훅 삭제 실패:", data.description ?? data);
  process.exit(1);
}
