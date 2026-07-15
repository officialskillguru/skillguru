type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private level: LogLevel = import.meta.env.DEV ? "debug" : "warn";

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  debug(message: string, ...args: unknown[]) {
    if (this.shouldLog("debug")) console.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    if (this.shouldLog("info")) console.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    if (this.shouldLog("warn")) console.warn(message, ...args);
  }

  error(message: string, error?: unknown, ...args: unknown[]) {
    if (this.shouldLog("error")) {
      console.error(message, error, ...args);
    }
  }
}

export const logger = new Logger();
