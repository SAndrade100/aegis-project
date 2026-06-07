import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./config/logger";
import http from "http";

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // ─── Graceful shutdown ────────────────────────────────────────────────────
  // Quando o processo recebe SIGTERM ou SIGINT (Ctrl+C / docker stop),
  // para de aceitar novas conexões e espera as existentes terminarem.

  let isShuttingDown = false;

  function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Para de aceitar novas conexões
    server.close((err) => {
      if (err) {
        logger.error("Error during server close", { error: err.message });
        process.exit(1);
      }

      logger.info("HTTP server closed");

      // TODO Fase 2: fechar conexão com Redis
      // TODO Fase 2: deregistrar do service registry

      logger.info("Graceful shutdown complete");
      process.exit(0);
    });

    // Força saída após 30s se não conseguir fechar limpo
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Loga erros não capturados sem derrubar o processo em produção
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
    if (config.env === "production") return; // mantém vivo em prod
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason: String(reason) });
  });

  // ─── Start ────────────────────────────────────────────────────────────────
  await new Promise<void>((resolve) => {
    server.listen(config.port, () => {
      resolve();
    });
  });

  logger.info(`🚀 API Gateway running`, {
    port: config.port,
    env: config.env,
    endpoints: {
      health: `http://localhost:${config.port}/health`,
      ready: `http://localhost:${config.port}/ready`,
      metrics: `http://localhost:${config.port}${config.metrics.path}`,
      info: `http://localhost:${config.port}/info`,
    },
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to start gateway", { error: err.message, stack: err.stack });
  process.exit(1);
});
