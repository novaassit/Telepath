# Telegram + LLM Chatbot

Ollama, OpenAI, 또는 **Custom(OpenAI 호환 API)**를 사용하는 텔레그램 1:1 AI 챗봇입니다.

## 기능

- 텔레그램 DM으로 자연어 대화
- **다중 LLM 지원**: `ollama` / `openai` / `custom` / `claude` / `gemini` 중 선택
- 유저별 대화 히스토리 유지 (문맥 기반 응답)
- `/start` — 봇 시작 및 환영 메시지
- `/clear` — 대화 히스토리 초기화
- 긴 응답 자동 분할 전송 (4096자 제한)

## 기술 스택

- **TypeScript / Node.js 18+**
- **[grammY](https://grammy.dev/)** — 텔레그램 봇 프레임워크
- **LLM**: [Ollama](https://ollama.com/) · OpenAI · Custom · [Claude](https://www.anthropic.com/) · [Gemini](https://ai.google.dev/)

## 프로젝트 구조

```
src/
├── config.ts    # 환경변수 로딩 및 검증
├── history.ts   # 유저별 인메모리 대화 히스토리
├── llm/         # LLM 프로바이더 (추상화)
│   ├── types.ts # LLMProvider 인터페이스
│   ├── ollama.ts
│   ├── openai.ts  # OpenAI 공식/Azure/Groq
│   ├── custom.ts  # Custom (OpenAI 호환 API)
│   ├── claude.ts  # Claude (Anthropic)
│   ├── gemini.ts  # Gemini (Google AI)
│   └── index.ts   # 프로바이더 팩토리
├── bot.ts       # grammY 봇 설정 및 핸들러
└── index.ts     # 엔트리포인트
```

## 사전 준비

1. **[텔레그램 BotFather](https://t.me/BotFather)**에서 봇 토큰 발급 (필수)

2. **LLM 중 하나** 준비:
   - **Ollama**: [설치](https://ollama.com/download) 후 서버 실행 및 모델 다운로드
     ```bash
     ollama serve
     ollama pull llama3.2
     ```
   - **OpenAI**: API 키 발급 (OpenAI, [Azure](https://azure.microsoft.com/products/cognitive-services/openai-service), [Groq](https://groq.com) 등)
   - **Custom**: OpenAI 호환 API 엔드포인트 (Open WebUI, LiteLLM, vLLM 등)
   - **Claude**: [Anthropic](https://console.anthropic.com/) API 키
   - **Gemini**: [Google AI Studio](https://aistudio.google.com/apikey) API 키

### LLM 프로바이더 선택

| 프로바이더 | 용도 | 필수 설정 |
|-----------|------|-----------|
| `ollama` | 로컬 Ollama | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |
| `openai` | OpenAI / Azure / Groq 등 | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| `custom` | 자체 호스팅·서드파티 OpenAI 호환 API | `CUSTOM_LLM_BASE_URL`, `CUSTOM_LLM_MODEL` |
| `claude` | Claude (Anthropic) | `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` |
| `gemini` | Gemini (Google AI) | `GEMINI_API_KEY`, `GEMINI_MODEL` |

## 설치 및 실행

```bash
git clone https://github.com/novaassit/telegram-ollama-bot.git
cd telegram-ollama-bot
npm install
cp .env.example .env
# .env 에 TELEGRAM_BOT_TOKEN 과 사용할 LLM 설정 입력
npm run dev
```

### 사용 예시

**Ollama (로컬)**  
`.env` 예:
```env
TELEGRAM_BOT_TOKEN=123456:ABC...
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

**OpenAI (클라우드)**  
`.env` 예:
```env
TELEGRAM_BOT_TOKEN=123456:ABC...
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

**Custom LLM (OpenAI 호환 API)**  
```env
LLM_PROVIDER=custom
CUSTOM_LLM_BASE_URL=https://your-api.com/v1
CUSTOM_LLM_API_KEY=optional_for_local
CUSTOM_LLM_MODEL=gpt-4o
```

**Claude (Anthropic)** — 모델 예: `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-code`
```env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6
CLAUDE_MAX_TOKENS=8192
```

**Gemini (Google AI)** — 모델 예: `gemini-2.5-flash`, `gemini-2.5-pro`
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MAX_TOKENS=8192
```

커스텀 엔드포인트(예: Azure, Groq)는 `openai` 프로바이더로:
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://your-api.openai.azure.com/openai/deployments/your-deployment
OPENAI_MODEL=gpt-4
```

## 환경변수

| 변수 | 필수 | 기본값 | 설명 |
|------|:----:|--------|------|
| `TELEGRAM_BOT_TOKEN` | O | — | BotFather에서 발급받은 토큰 |
| `LLM_PROVIDER` | | `ollama` | `ollama` \| `openai` \| `custom` \| `claude` \| `gemini` |
| **Ollama** | | | |
| `OLLAMA_BASE_URL` | | `http://localhost:11434` | Ollama 서버 주소 |
| `OLLAMA_MODEL` | | `llama3.2` | 사용할 모델 |
| **OpenAI** | | | |
| `OPENAI_API_KEY` | O\* | — | API 키 (\*openai 선택 시 필수) |
| `OPENAI_BASE_URL` | | OpenAI 공식 | Azure·Groq 등 엔드포인트 |
| `OPENAI_MODEL` | | `gpt-4o` | 모델명 |
| **Custom** | | | OpenAI 호환 API (Open WebUI, LiteLLM 등) |
| `CUSTOM_LLM_BASE_URL` | O\* | — | API 베이스 URL (\*custom 선택 시 필수) |
| `CUSTOM_LLM_API_KEY` | | — | API 키 (선택) |
| `CUSTOM_LLM_MODEL` | | `gpt-4o` | 모델명 |
| **Claude** | | | Anthropic Claude |
| `ANTHROPIC_API_KEY` | O\* | — | API 키 (\*claude 선택 시 필수) |
| `CLAUDE_MODEL` | | `claude-sonnet-4-6` | 모델 (예: claude-opus-4-6, claude-code) |
| `CLAUDE_MAX_TOKENS` | | `8192` | 최대 출력 토큰 |
| **Gemini** | | | Google AI Gemini |
| `GEMINI_API_KEY` | O\* | — | API 키 (\*gemini 선택 시 필수) |
| `GEMINI_MODEL` | | `gemini-2.5-flash` | 모델명 |
| `GEMINI_MAX_TOKENS` | | `8192` | 최대 출력 토큰 |
| **공통** | | | |
| `SYSTEM_PROMPT` | | `You are a helpful assistant.` | 시스템 프롬프트 |
| `MAX_HISTORY_MESSAGES` | | `20` | 유지할 최대 대화 메시지 수 |

## 빌드

```bash
npm run build   # TypeScript → JavaScript (dist/)
npm start       # 빌드된 파일 실행
```

## 문제 해결

### 봇이 메시지를 받지 않을 때

1. **웹훅 삭제**  
   이 봇은 **폴링**으로 동작합니다. 같은 봇으로 웹훅을 설정한 적이 있으면, Telegram이 업데이트를 웹훅 URL로만 보내서 로컬에서는 메시지를 받지 못합니다. **봇을 중지한 뒤** 아래를 실행하세요.

   ```bash
   npm run webhook:delete
   ```

   완료 후 `npm run dev`로 봇을 다시 실행하고, 텔레그램에서 메시지를 보낸 뒤 터미널에 `[업데이트 수신]` 로그가 찍히는지 확인하세요.

2. **터미널 로그 확인**  
   봇 실행 시 `봇이 실행 중입니다! (폴링 연결됨)` 이 보여야 합니다. 메시지를 보낼 때마다 `[수신] chat_id=...` 로그가 찍히면 Telegram에서 메시지는 정상 수신 중인 것입니다.

3. **텍스트로만 테스트**  
   현재 봇은 **텍스트 메시지**에만 응답합니다. 사진·스티커만 보내면 "텍스트로 메시지를 보내주세요." 로만 답합니다.

4. **토큰 확인**  
   [BotFather](https://t.me/BotFather)에서 발급한 토큰이 `.env`의 `TELEGRAM_BOT_TOKEN`과 일치하는지 확인하세요.

5. **`Network request for 'getMe' failed`**  
   Telegram API(`api.telegram.org`)에 연결되지 않는 **네트워크 문제**입니다.  
   - 방화벽·회사/학교 네트워크에서 Telegram 차단 여부 확인  
   - VPN 사용 중이면 해제 후 재시도 (반대로 차단 지역이면 VPN 켜고 재시도)  
   - 다른 네트워크(예: 휴대폰 테더링)에서 실행해 보기

## 새 LLM 프로바이더 추가하기

1. `src/llm/` 아래에 새 파일 추가 (예: `anthropic.ts`)
2. `LLMProvider` 인터페이스 구현: `chat(messages: Message[]): Promise<string>`
3. `src/config.ts`에 프로바이더 타입 및 환경변수 추가
4. `src/llm/index.ts`의 `getLLMProvider()`에 분기 추가
