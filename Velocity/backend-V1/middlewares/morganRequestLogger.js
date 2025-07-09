import morgan from "morgan";
import fs from "fs";
import path from "path";
import { createLogger, format } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const requestsLogDir = path.join("/app/logs", "requestsLogs");

// Ensure log folder exists
if (!fs.existsSync(requestsLogDir)) {
  console.log("Creating missing log directory: logs/requestsLogs");
  fs.mkdirSync(requestsLogDir, { recursive: true });
}

// Winston logger for request logs
const requestLogger = createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new DailyRotateFile({
      filename: path.join(requestsLogDir, "requests-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      frequency: "7d",
      zippedArchive: true,
      maxFiles: 5,
      level: "info",
    }),
  ],
});

morgan.token("json_log", (req, res) => {
  const statusCode = res.statusCode || "-";

  // Determine log level based on status code
  let level;
  if (statusCode >= 500) {
    level = "ERROR";
  } else if (statusCode >= 400) {
    level = "WARN";
  } else {
    level = "INFO";
  }

  const logData = {
    req_id: req.requestId || "-",
    user_id: req.userID || "-",
    ip: req.ip || "-",
    user_agent: req.get("User-Agent") || "-",
    level: level,
    method: req.method || "-",
    endpoint: req.originalUrl || "-",
    status_code: statusCode,
    response_time: res.getHeader("X-Response-Time") || "-",
  };
  return JSON.stringify(logData);
});

// Stream object for morgan
const stream = {
  write: (message) => {
    try {
      const logObject = JSON.parse(message);
      const status = parseInt(logObject.status_code, 10);

      if (status >= 500) {
        requestLogger.error(logObject);
      } else if (status >= 400) {
        requestLogger.warn(logObject);
      } else {
        requestLogger.info(logObject);
      }
    } catch (err) {
      console.error("Failed to parse log message:", message);
    }
  },
};

// Export middleware using ":json" format
export const morganMiddleware = morgan(":json_log", { stream });
