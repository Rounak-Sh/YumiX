import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

// Get directory name when using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(
    ({ level, message, timestamp, stack }) =>
      `${timestamp} [${level.toUpperCase()}]: ${message} ${
        stack ? `\n${stack}` : ""
      }`
  )
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  defaultMeta: { service: "yumix-api" },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
  exitOnError: false,
});

// Simplified error logging function that supports both error objects and strings
const formatError = (error) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      ...error,
    };
  }
  return { message: String(error) };
};

// Export a simplified interface
export default {
  info: (message) => logger.info(message),
  error: (message, error) => {
    if (error) {
      const formattedError = formatError(error);
      logger.error(`${message} - ${formattedError.message}`, {
        error: formattedError,
      });
    } else {
      logger.error(message);
    }
  },
  warn: (message) => logger.warn(message),
  debug: (message) => logger.debug(message),
};
