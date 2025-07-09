import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";
import path from "path";
import { getRequestContext } from "./requestContext.js";

const logBasePath = "/app/logs";
const errorLogDir = path.join(logBasePath, "errorLogs");
const accessLogDir = path.join(logBasePath, "accessLogs");

// Ensure directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating missing log directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
};
[logBasePath, errorLogDir, accessLogDir].forEach(ensureDir);

// Custom format that includes request context
const customFormat = format.combine(
  format.timestamp(),
  format.printf((info) => {
    const context = getRequestContext();
    const logObject = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      req_id: context.requestId || "-",
      user_id: context.userId || "-",
      ip: context.ip || "-",
      meta: info.meta || "-",
    };
    return JSON.stringify(logObject);
  })
);

// Filter only specific log levels req-57aa4ae58a1e4c50
const levelFilter = (level) =>
  format((info) => (info.level === level ? info : false))();

// Create the main logger
export const logger = createLogger({
  level: (() => {
    switch (process.env.NODE_ENV) {
      case "production":
        return "warn";
      case "development":
        return "debug";
      default:
        return "info";
    }
  })(),
  format: customFormat,
  transports: [
    // Access log — only 'info'
    new DailyRotateFile({
      filename: path.join(accessLogDir, `access-%DATE%.log`),
      datePattern: "YYYY-MM-DD",
      frequency: "7d",
      zippedArchive: true,
      maxFiles: 5,
      level: "info",
      format: format.combine(levelFilter("info"), customFormat),
    }),

    // Error log — 'warn' and 'error'
    new DailyRotateFile({
      filename: path.join(errorLogDir, `error-%DATE%.log`),
      datePattern: "YYYY-MM-DD",
      frequency: "7d",
      zippedArchive: true,
      maxFiles: 5,
      level: "warn", // captures warn + error
      format: customFormat,
    }),
  ],
});

// Console logging in non-production environments
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      level: "debug",
      format: format.combine(
        format.colorize({ all: true }),
        format.printf(
          ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`
        )
      ),
    })
  );
}
