import { EventEmitter } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

export type BotStatus = "stopped" | "starting" | "running" | "error";

export interface LogEntry {
  level: "info" | "error";
  text: string;
  timestamp: string;
}

export class BotRunner extends EventEmitter {
  private child: ChildProcess | null = null;
  private _status: BotStatus = "stopped";

  get status(): BotStatus {
    return this._status;
  }

  private setStatus(status: BotStatus) {
    this._status = status;
    this.emit("status-change", status);
  }

  private log(level: "info" | "error", text: string) {
    const entry: LogEntry = {
      level,
      text,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
    };
    this.emit("log", entry);
  }

  start(projectRoot: string, envVars: Record<string, string>): void {
    if (this._status === "running" || this._status === "starting") {
      this.log("info", "봇이 이미 실행 중입니다.");
      return;
    }

    this.setStatus("starting");
    this.log("info", "봇을 시작합니다...");

    const tsxBin = path.resolve(projectRoot, "node_modules", ".bin", "tsx");
    const entryFile = path.resolve(projectRoot, "src", "index.ts");

    const mergedEnv = { ...process.env, ...envVars };

    this.child = spawn(tsxBin, [entryFile], {
      cwd: projectRoot,
      env: mergedEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString().trim();
      if (!text) return;
      for (const line of text.split("\n")) {
        this.log("info", line);
        if (line.includes("봇이 실행 중입니다")) {
          this.setStatus("running");
        }
      }
    });

    this.child.stderr?.on("data", (data: Buffer) => {
      const text = data.toString().trim();
      if (!text) return;
      for (const line of text.split("\n")) {
        this.log("error", line);
      }
    });

    this.child.on("exit", (code) => {
      this.child = null;
      if (this._status === "starting") {
        this.setStatus("error");
        this.log("error", `봇 시작 실패 (exit code: ${code})`);
      } else {
        this.setStatus("stopped");
        this.log("info", `봇이 종료되었습니다 (exit code: ${code})`);
      }
    });

    this.child.on("error", (err) => {
      this.child = null;
      this.setStatus("error");
      this.log("error", `프로세스 오류: ${err.message}`);
    });
  }

  stop(): void {
    if (!this.child) {
      this.log("info", "봇이 실행 중이 아닙니다.");
      return;
    }
    this.log("info", "봇을 종료합니다...");
    this.child.kill("SIGTERM");
  }
}
