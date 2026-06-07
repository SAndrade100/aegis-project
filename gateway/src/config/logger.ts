import winston from "winston";
import { config } from "../config";

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss.SSS" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, requestId, service, ...meta }) => {
    const rid = requestId ? ` [${requestId}]` : "";
    const svc = service ? ` (${service})` : "";
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}${rid}${svc}: ${message}${extra}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: config.env === "production" ? prodFormat : devFormat,
  defaultMeta: { service: "api-gateway" },
  transports: [
    new winston.transports.Console(),
  ],
  // Não deixa exceções não capturadas derrubarem o processo silenciosamente
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});

// Logger filho com contexto de request (usado nos middlewares)
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
