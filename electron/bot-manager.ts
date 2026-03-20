import { EventEmitter } from "node:events";
import { BotRunner, type BotStatus, type LogEntry } from "./bot-runner";
import { ProfileManager } from "./profile-manager";

export interface BotStatusInfo {
  botId: string;
  name: string;
  status: BotStatus;
  providerId: string;
}

export class BotManager extends EventEmitter {
  private runners = new Map<string, BotRunner>();
  private profileManager: ProfileManager;
  private projectRoot: string;

  constructor(profileManager: ProfileManager, projectRoot: string) {
    super();
    this.profileManager = profileManager;
    this.projectRoot = projectRoot;
  }

  startBot(botId: string): { ok: boolean; error?: string } {
    const envVars = this.profileManager.flattenBotToEnv(botId);
    if (!envVars) {
      return { ok: false, error: `Bot "${botId}" not found or invalid provider` };
    }

    let runner = this.runners.get(botId);
    if (runner && (runner.status === "running" || runner.status === "starting")) {
      return { ok: false, error: `Bot "${botId}" is already running` };
    }

    runner = new BotRunner(botId);
    this.runners.set(botId, runner);

    runner.on("log", (entry: LogEntry) => {
      this.emit("log", { ...entry, botId });
    });

    runner.on("status-change", (status: BotStatus) => {
      const bot = this.profileManager.getBot(botId);
      this.emit("status-change", {
        botId,
        name: bot?.name ?? botId,
        status,
        providerId: bot?.llmProvider ?? "",
      } satisfies BotStatusInfo);
    });

    runner.start(this.projectRoot, envVars);
    return { ok: true };
  }

  stopBot(botId: string): void {
    const runner = this.runners.get(botId);
    if (runner) {
      runner.stop();
    }
  }

  stopAll(): void {
    for (const runner of this.runners.values()) {
      runner.stop();
    }
  }

  getBotStatus(botId: string): BotStatus {
    return this.runners.get(botId)?.status ?? "stopped";
  }

  getAllStatuses(): BotStatusInfo[] {
    const bots = this.profileManager.getBots();
    return Object.entries(bots).map(([botId, bot]) => ({
      botId,
      name: bot.name,
      status: this.runners.get(botId)?.status ?? "stopped",
      providerId: bot.llmProvider,
    }));
  }
}
