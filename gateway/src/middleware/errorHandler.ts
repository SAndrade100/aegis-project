import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { config } from "../config";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean; // erros operacionais vs erros de programação
}

/**
 * Cria um erro operacional padronizado.
 * Erros operacionais são esperados (rate limit, auth falha, serviço indisponível)
 * e não precisam de stack trace no log de produção.
 */
export function createError(
  message: string,
  statusCode: number,
  code: string
): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.isOperational = true;
  return err;
}

export const GatewayErrors = {
  RATE_LIMITED: () => createError("Rate limit exceeded", 429, "RATE_LIMITED"),
  UNAUTHORIZED: (msg = "Unauthorized") => createError(msg, 401, "UNAUTHORIZED"),
  FORBIDDEN: () => createError("Forbidden", 403, "FORBIDDEN"),
  CIRCUIT_OPEN: (service: string) =>
    createError(`Service ${service} is currently unavailable`, 503, "CIRCUIT_OPEN"),
  UPSTREAM_TIMEOUT: (service: string) =>
    createError(`Upstream timeout: ${service}`, 504, "UPSTREAM_TIMEOUT"),
  SERVICE_NOT_FOUND: (service: string) =>
    createError(`No healthy instances for service: ${service}`, 503, "SERVICE_NOT_FOUND"),
} as const;

/**
 * Handler de erros global — deve ser o ÚLTIMO middleware registrado no Express.
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction // NextFunction precisa estar na assinatura mesmo sem uso
): void {
  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;

  // Erros de programação (500 inesperados) sempre logam com stack trace
  if (!isOperational || statusCode >= 500) {
    logger.error("Unhandled error", {
      requestId: req.id,
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  const body: Record<string, unknown> = {
    error: {
      code: err.code ?? "INTERNAL_ERROR",
      message: isOperational ? err.message : "Internal server error",
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  };

  // Em dev, expõe o stack trace no body para facilitar debug
  if (config.env === "development" && !isOperational) {
    body.error = { ...body.error as object, stack: err.stack };
  }

  res.status(statusCode).json(body);
}

/**
 * Captura rotas não encontradas e converte em 404 estruturado.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const err = createError(`Route not found: ${req.method} ${req.path}`, 404, "NOT_FOUND");
  next(err);
}
