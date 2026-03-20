import fs from "node:fs";
import path from "node:path";
import { readEnvFile } from "./env-manager";

export interface LLMProviderConfig {
  type: "ollama" | "openai" | "custom" | "claude" | "gemini";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
}

export interface BotConfig {
  name: string;
  telegramBotToken: string;
  llmProvider: string;
  systemPrompt?: string;
  maxHistoryMessages?: number;
  maxInputLength?: number;
  allowFrom?: number[];
}

export interface ProfilesData {
  version: number;
  llmProviders: Record<string, LLMProviderConfig>;
  bots: Record<string, BotConfig>;
}

const DEFAULT_PROFILES: ProfilesData = {
  version: 1,
  llmProviders: {},
  bots: {},
};

export class ProfileManager {
  private profilesPath: string;
  private envDir: string;

  constructor(dataDir: string, envDir: string) {
    this.profilesPath = path.join(dataDir, "profiles.json");
    this.envDir = envDir;
  }

  read(): ProfilesData {
    if (!fs.existsSync(this.profilesPath)) {
      // Try to migrate from .env
      const migrated = this.migrateFromEnv();
      if (migrated) {
        this.write(migrated);
        return migrated;
      }
      this.write(DEFAULT_PROFILES);
      return { ...DEFAULT_PROFILES };
    }
    const raw = fs.readFileSync(this.profilesPath, "utf-8");
    return JSON.parse(raw) as ProfilesData;
  }

  write(data: ProfilesData): void {
    fs.writeFileSync(this.profilesPath, JSON.stringify(data, null, 2), "utf-8");
  }

  // --- LLM Provider CRUD ---

  getProviders(): Record<string, LLMProviderConfig> {
    return this.read().llmProviders;
  }

  getProvider(id: string): LLMProviderConfig | undefined {
    return this.read().llmProviders[id];
  }

  saveProvider(id: string, config: LLMProviderConfig): void {
    const data = this.read();
    data.llmProviders[id] = config;
    this.write(data);
  }

  deleteProvider(id: string): { ok: boolean; error?: string } {
    const data = this.read();
    // Check if any bot uses this provider
    const usedBy = Object.entries(data.bots)
      .filter(([, bot]) => bot.llmProvider === id)
      .map(([botId]) => botId);

    if (usedBy.length > 0) {
      return {
        ok: false,
        error: `Provider "${id}" is used by bots: ${usedBy.join(", ")}`,
      };
    }

    delete data.llmProviders[id];
    this.write(data);
    return { ok: true };
  }

  // --- Bot CRUD ---

  getBots(): Record<string, BotConfig> {
    return this.read().bots;
  }

  getBot(id: string): BotConfig | undefined {
    return this.read().bots[id];
  }

  saveBot(id: string, config: BotConfig): void {
    const data = this.read();
    data.bots[id] = config;
    this.write(data);
  }

  deleteBot(id: string): void {
    const data = this.read();
    delete data.bots[id];
    this.write(data);
  }

  // --- Flatten bot config to env vars (for child process) ---

  flattenBotToEnv(botId: string): Record<string, string> | null {
    const data = this.read();
    const bot = data.bots[botId];
    if (!bot) return null;

    const provider = data.llmProviders[bot.llmProvider];
    if (!provider) return null;

    const env: Record<string, string> = {};

    // Bot settings
    env.TELEGRAM_BOT_TOKEN = bot.telegramBotToken;
    env.LLM_PROVIDER = provider.type;
    if (bot.systemPrompt) env.SYSTEM_PROMPT = bot.systemPrompt;
    if (bot.maxHistoryMessages != null)
      env.MAX_HISTORY_MESSAGES = String(bot.maxHistoryMessages);
    if (bot.maxInputLength != null)
      env.MAX_INPUT_LENGTH = String(bot.maxInputLength);
    if (bot.allowFrom && bot.allowFrom.length > 0)
      env.ALLOW_FROM = bot.allowFrom.join(",");

    // Provider settings
    switch (provider.type) {
      case "ollama":
        if (provider.baseUrl) env.OLLAMA_BASE_URL = provider.baseUrl;
        if (provider.model) env.OLLAMA_MODEL = provider.model;
        break;
      case "openai":
        if (provider.apiKey) env.OPENAI_API_KEY = provider.apiKey;
        if (provider.baseUrl) env.OPENAI_BASE_URL = provider.baseUrl;
        if (provider.model) env.OPENAI_MODEL = provider.model;
        break;
      case "custom":
        if (provider.baseUrl) env.CUSTOM_LLM_BASE_URL = provider.baseUrl;
        if (provider.apiKey) env.CUSTOM_LLM_API_KEY = provider.apiKey;
        if (provider.model) env.CUSTOM_LLM_MODEL = provider.model;
        break;
      case "claude":
        if (provider.apiKey) env.ANTHROPIC_API_KEY = provider.apiKey;
        if (provider.model) env.CLAUDE_MODEL = provider.model;
        if (provider.maxTokens) env.CLAUDE_MAX_TOKENS = String(provider.maxTokens);
        break;
      case "gemini":
        if (provider.apiKey) env.GEMINI_API_KEY = provider.apiKey;
        if (provider.model) env.GEMINI_MODEL = provider.model;
        if (provider.maxTokens) env.GEMINI_MAX_TOKENS = String(provider.maxTokens);
        break;
    }

    return env;
  }

  // --- Migration from .env ---

  private migrateFromEnv(): ProfilesData | null {
    const envPath = path.join(this.envDir, ".env");
    if (!fs.existsSync(envPath)) return null;

    const env = readEnvFile(envPath);
    if (!env.TELEGRAM_BOT_TOKEN) return null;

    const providerType = (env.LLM_PROVIDER || "ollama") as LLMProviderConfig["type"];
    const providerId = `${providerType}-default`;

    const providerConfig: LLMProviderConfig = { type: providerType };

    switch (providerType) {
      case "ollama":
        if (env.OLLAMA_BASE_URL) providerConfig.baseUrl = env.OLLAMA_BASE_URL;
        if (env.OLLAMA_MODEL) providerConfig.model = env.OLLAMA_MODEL;
        break;
      case "openai":
        if (env.OPENAI_API_KEY) providerConfig.apiKey = env.OPENAI_API_KEY;
        if (env.OPENAI_BASE_URL) providerConfig.baseUrl = env.OPENAI_BASE_URL;
        if (env.OPENAI_MODEL) providerConfig.model = env.OPENAI_MODEL;
        break;
      case "custom":
        if (env.CUSTOM_LLM_BASE_URL) providerConfig.baseUrl = env.CUSTOM_LLM_BASE_URL;
        if (env.CUSTOM_LLM_API_KEY) providerConfig.apiKey = env.CUSTOM_LLM_API_KEY;
        if (env.CUSTOM_LLM_MODEL) providerConfig.model = env.CUSTOM_LLM_MODEL;
        break;
      case "claude":
        if (env.ANTHROPIC_API_KEY) providerConfig.apiKey = env.ANTHROPIC_API_KEY;
        if (env.CLAUDE_MODEL) providerConfig.model = env.CLAUDE_MODEL;
        if (env.CLAUDE_MAX_TOKENS) providerConfig.maxTokens = Number(env.CLAUDE_MAX_TOKENS);
        break;
      case "gemini":
        if (env.GEMINI_API_KEY) providerConfig.apiKey = env.GEMINI_API_KEY;
        if (env.GEMINI_MODEL) providerConfig.model = env.GEMINI_MODEL;
        if (env.GEMINI_MAX_TOKENS) providerConfig.maxTokens = Number(env.GEMINI_MAX_TOKENS);
        break;
    }

    const botConfig: BotConfig = {
      name: "Default Bot",
      telegramBotToken: env.TELEGRAM_BOT_TOKEN,
      llmProvider: providerId,
      systemPrompt: env.SYSTEM_PROMPT || undefined,
      maxHistoryMessages: env.MAX_HISTORY_MESSAGES
        ? Number(env.MAX_HISTORY_MESSAGES)
        : undefined,
      maxInputLength: env.MAX_INPUT_LENGTH
        ? Number(env.MAX_INPUT_LENGTH)
        : undefined,
      allowFrom: env.ALLOW_FROM
        ? env.ALLOW_FROM.split(",").map((s) => s.trim()).filter(Boolean).map(Number)
        : undefined,
    };

    return {
      version: 1,
      llmProviders: { [providerId]: providerConfig },
      bots: { default: botConfig },
    };
  }
}
