import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInFlight,
} from "./metrics";
import { logger } from "../config/logger";

// Augmenta o tipo Request do Express para expor campos extras
declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: [number, number]; // hrtime tuple
    }
  }
}

/**
 * Injeta um ID único em cada request.
 * Usa o header X-Request-ID se vier do cliente (útil para tracing distribuído),
 * ou gera um UUID novo.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.id = (req.headers["x-request-id"] as string) ?? randomUUID();
  req.startTime = process.hrtime();
  res.setHeader("x-request-id", req.id);
  next();
}

/**
 * Coleta métricas de latência e contagem de requests para o Prometheus.
 * Registra no "finish" do response para capturar o status code final.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Ignora requisições para /metrics e /health para não poluir os dados
  if (req.path === "/metrics" || req.path === "/health" || req.path === "/ready") {
    return next();
  }

  httpRequestsInFlight.inc();

  res.on("finish", () => {
    const [sec, ns] = process.hrtime(req.startTime);
    const durationSeconds = sec + ns / 1e9;

    // Normaliza o path para evitar cardinalidade infinita (e.g. /users/123 → /users/:id)
    const normalizedPath = normalizePath(req.path);
    const upstreamService = (res.getHeader("x-upstream-service") as string) ?? "unknown";

    const labels = {
      method: req.method,
      path: normalizedPath,
      status_code: String(res.statusCode),
      upstream_service: upstreamService,
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsInFlight.dec();

    // Log estruturado de cada request (nível debug em dev, info em prod para 5xx)
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "debug";
    logger[level](`${req.method} ${req.path} → ${res.statusCode}`, {
      requestId: req.id,
      durationMs: (durationSeconds * 1000).toFixed(2),
      upstream: upstreamService,
      ip: req.ip,
    });
  });

  next();
}

/**
 * Normaliza paths com IDs para evitar explodir a cardinalidade das métricas.
 * /users/123        → /users/:id
 * /orders/abc-def   → /orders/:id
 * /products/42/sku  → /products/:id/sku
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id") // UUID
    .replace(/\/\d+/g, "/:id") // números
    .replace(/\/[a-zA-Z0-9]{20,}/g, "/:id"); // hashes longas
}
