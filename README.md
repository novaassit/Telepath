# Telegram + Ollama Chatbot

로컬 Ollama(llama3)를 활용한 텔레그램 1:1 AI 챗봇입니다.

## 기능

- 텔레그램 DM으로 자연어 대화
- 유저별 대화 히스토리 유지 (문맥 기반 응답)
- `/start` - 봇 시작 및 환영 메시지
- `/clear` - 대화 히스토리 초기화
- 긴 응답 자동 분할 전송 (4096자 제한)

## 기술 스택

- **TypeScript / Node.js 18+**
- **[grammY](https://grammy.dev/)** - 텔레그램 봇 프레임워크
- **[Ollama](https://ollama.com/)** - 로컬 LLM 서버 (llama3)

## 프로젝트 구조

```
src/
├── config.ts    # 환경변수 로딩 및 검증
├── history.ts   # 유저별 인메모리 대화 히스토리
├── ollama.ts    # Ollama REST API 클라이언트
├── bot.ts       # grammY 봇 설정 및 핸들러
└── index.ts     # 엔트리포인트
```

## 사전 준비

1. [Ollama 설치](https://ollama.com/download) 후 모델 다운로드:
   ```bash
   ollama serve
   ollama pull llama3
   ```

2. [텔레그램 BotFather](https://t.me/BotFather)에서 봇 토큰 발급

## 설치 및 실행

```bash
git clone https://github.com/novaassit/telegram-ollama-bot.git
cd telegram-ollama-bot
npm install
cp .env.example .env  # TELEGRAM_BOT_TOKEN 입력
npm run dev
```

## 환경변수

| 변수 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | O | - | BotFather에서 발급받은 토큰 |
| `OLLAMA_BASE_URL` | X | `http://localhost:11434` | Ollama 서버 주소 |
| `OLLAMA_MODEL` | X | `llama3` | 사용할 모델 |
| `SYSTEM_PROMPT` | X | `You are a helpful assistant.` | 시스템 프롬프트 |
| `MAX_HISTORY_MESSAGES` | X | `20` | 유지할 최대 대화 메시지 수 |

## 빌드

```bash
npm run build   # TypeScript → JavaScript (dist/)
npm start       # 빌드된 파일 실행
```
