import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";
import path from "path";
const logBasePath = "/app/logs";
const extensionLogDir = path.join(logBasePath, "extensionLogs");
const extensionErrorLogDir = path.join(extensionLogDir, "errorLogs");
const extensionAccessLogDir = path.join(extensionLogDir, "accessLogs");
// const extensionJsonLogDir = path.join(extensionLogDir, "jsonLogs");
// Ensure directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating missing extension log directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
};
[
  logBasePath,
  extensionLogDir,
  extensionErrorLogDir,
  extensionAccessLogDir,
  // extensionJsonLogDir,
].forEach(ensureDir);
// Filter only specific log levels
const levelFilter = (level) =>
  format((info) => (info.level === level ? info : false))();
// Create the extension logger
export const extensionLogger = createLogger({
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
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(
      ({ timestamp, level, message, userId, metadata }) =>
        `${timestamp} ${level}: [User: ${userId || "anonymous"}] ${message} ${
          metadata ? JSON.stringify(metadata) : ""
        }`
    )
  ),
  transports: [
    // Extension access log — only 'info'
    new DailyRotateFile({
      filename: path.join(extensionAccessLogDir, `extension-access-%DATE%.log`),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxFiles: "30d",
      level: "info",
      format: format.combine(
        levelFilter("info"),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.printf(
          ({ timestamp, level, message, userId, metadata }) =>
            `${timestamp} ${level}: [User: ${
              userId || "anonymous"
            }] ${message} ${metadata ? JSON.stringify(metadata) : ""}`
        )
      ),
    }),
    // Extension error log — 'warn' and 'error'
    new DailyRotateFile({
      filename: path.join(extensionErrorLogDir, `extension-error-%DATE%.log`),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxFiles: "30d",
      level: "warn", // captures warn + error
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.printf(
          ({ timestamp, level, message, userId, metadata }) =>
            `${timestamp} ${level}: [User: ${
              userId || "anonymous"
            }] ${message} ${metadata ? JSON.stringify(metadata) : ""}`
        )
      ),
    }),
    // new DailyRotateFile({
    //   filename: path.join(extensionJsonLogDir, `extension-json-%DATE%.log`),
    //   datePattern: "YYYY-MM-DD",
    //   zippedArchive: true,
    //   maxFiles: "30d",
    //   level: "info",
    //   format: format.combine(format.timestamp(), format.json()),
    // }),
  ],
});
// Console logging in non-production environments
if (process.env.NODE_ENV !== "production") {
  extensionLogger.add(
    new transports.Console({
      level: "debug",
      format: format.combine(
        format.colorize({ all: true }),
        format.printf(
          ({ timestamp, level, message, userId, metadata }) =>
            `${timestamp} ${level}: [User: ${
              userId || "anonymous"
            }] ${message} ${metadata ? JSON.stringify(metadata) : ""}`
        )
      ),
    })
  );
}
