/**
 * OpenTelemetry-compatible logger.
 * In production, wire to OTLP exporter; for now structured console.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  tenant_id?: string;
  agent_id?: string;
  invocation_id?: string;
  [key: string]: unknown;
}

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[minLevel];
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const payload = {
    "@timestamp": new Date().toISOString(),
    level,
    message,
    ...context,
  };
  return JSON.stringify(payload);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog("debug")) console.debug(formatMessage("debug", message, context));
  },
  info(message: string, context?: LogContext) {
    if (shouldLog("info")) console.info(formatMessage("info", message, context));
  },
  warn(message: string, context?: LogContext) {
    if (shouldLog("warn")) console.warn(formatMessage("warn", message, context));
  },
  error(message: string, context?: LogContext) {
    if (shouldLog("error")) console.error(formatMessage("error", message, context));
  },
};
