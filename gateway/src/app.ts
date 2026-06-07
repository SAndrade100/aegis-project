import express, { Request, Response } from "express";
import { registry } from "./middleware/metrics";
import { requestIdMiddleware, metricsMiddleware } from "./middleware/requestId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { config } from "./config";
import { logger } from "./config/logger";

export function createApp() {
  const app = express();

  // ─── Core middleware ──────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Remove header que expõe que é Express (segurança básica)
  app.disable("x-powered-by");

  // Injeta request ID em todas as requests
  app.use(requestIdMiddleware);

  // Coleta métricas de latência e contagem
  app.use(metricsMiddleware);

  // ─── Observability endpoints ──────────────────────────────────────────────

  /**
   * GET /health
   * Liveness probe: o processo está vivo?
   * Retorna 200 se o gateway está rodando.
   * Kubernetes/Docker usam isso para decidir se reiniciam o container.
   */
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? "dev",
    });
  });

  /**
   * GET /ready
   * Readiness probe: o gateway está pronto para receber tráfego?
   * Nas próximas fases vai verificar Redis, serviços registrados, etc.
   * Por ora retorna 200 simples.
   */
  app.get("/ready", async (_req: Request, res: Response) => {
    // TODO Fase 2: verificar conexão com Redis e service registry
    const checks = {
      gateway: "ok",
      // redis: await checkRedis(),
      // serviceRegistry: await checkServiceRegistry(),
    };

    const allHealthy = Object.values(checks).every((v) => v === "ok");
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "ready" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /metrics
   * Endpoint raspado pelo Prometheus a cada 5s.
   * Expõe todas as métricas do registry em formato text/plain.
   */
  app.get(config.metrics.path, async (_req: Request, res: Response) => {
    try {
      res.set("Content-Type", registry.contentType);
      res.end(await registry.metrics());
    } catch (err) {
      res.status(500).end(String(err));
    }
  });

  /**
   * GET /info
   * Informações sobre a instância do gateway (útil para debug).
   */
  app.get("/info", (_req: Request, res: Response) => {
    res.json({
      name: "api-gateway",
      version: process.env.npm_package_version ?? "dev",
      environment: config.env,
      node: process.version,
      pid: process.pid,
      memory: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      },
      uptime: `${Math.round(process.uptime())}s`,
      config: {
        port: config.port,
        rateLimit: config.rateLimit,
        circuitBreaker: config.circuitBreaker,
        proxy: config.proxy,
      },
    });
  });

  // ─── Placeholder das rotas de proxy (Fase 2) ──────────────────────────────
  // app.use("/api", proxyRouter);

  // ─── Fallback handlers ────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.debug("Express app created", {
    endpoints: ["/health", "/ready", config.metrics.path, "/info"],
  });

  return app;
}
