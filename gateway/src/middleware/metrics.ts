import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";
import { config } from "../config";

// Registry isolado — evita conflito com o registry global em testes
export const registry = new Registry();

// Coleta métricas padrão do Node.js: heap, event loop lag, GC, etc.
collectDefaultMetrics({
  register: registry,
  prefix: config.metrics.prefix,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10,
});

// ─── HTTP Request metrics ────────────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: `${config.metrics.prefix}http_requests_total`,
  help: "Total de requisições HTTP recebidas pelo gateway",
  labelNames: ["method", "path", "status_code", "upstream_service"],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: `${config.metrics.prefix}http_request_duration_seconds`,
  help: "Duração das requisições HTTP em segundos (latência end-to-end)",
  labelNames: ["method", "path", "status_code", "upstream_service"],
  // Buckets cobrindo desde respostas ultra-rápidas até timeouts
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [registry],
});

export const httpRequestsInFlight = new Gauge({
  name: `${config.metrics.prefix}http_requests_in_flight`,
  help: "Número de requisições sendo processadas agora",
  registers: [registry],
});

// ─── Rate Limiting metrics ───────────────────────────────────────────────────

export const rateLimitHitsTotal = new Counter({
  name: `${config.metrics.prefix}rate_limit_hits_total`,
  help: "Total de requisições bloqueadas pelo rate limiter",
  labelNames: ["client_id", "route"],
  registers: [registry],
});

export const rateLimitTokensRemaining = new Gauge({
  name: `${config.metrics.prefix}rate_limit_tokens_remaining`,
  help: "Tokens restantes no bucket de um cliente (amostragem)",
  labelNames: ["client_id"],
  registers: [registry],
});

// ─── Circuit Breaker metrics ─────────────────────────────────────────────────

export const circuitBreakerState = new Gauge({
  name: `${config.metrics.prefix}circuit_breaker_state`,
  help: "Estado do circuit breaker: 0=CLOSED, 1=OPEN, 2=HALF_OPEN",
  labelNames: ["upstream_service"],
  registers: [registry],
});

export const circuitBreakerTripsTotal = new Counter({
  name: `${config.metrics.prefix}circuit_breaker_trips_total`,
  help: "Quantas vezes o circuit breaker abriu para um serviço",
  labelNames: ["upstream_service"],
  registers: [registry],
});

// ─── Upstream / Proxy metrics ────────────────────────────────────────────────

export const upstreamRequestDuration = new Histogram({
  name: `${config.metrics.prefix}upstream_request_duration_seconds`,
  help: "Tempo de resposta dos microsserviços upstream",
  labelNames: ["upstream_service", "status_code"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30],
  registers: [registry],
});

export const upstreamErrorsTotal = new Counter({
  name: `${config.metrics.prefix}upstream_errors_total`,
  help: "Erros retornados pelos microsserviços (5xx ou timeout)",
  labelNames: ["upstream_service", "error_type"],
  registers: [registry],
});

// ─── Auth metrics ────────────────────────────────────────────────────────────

export const authFailuresTotal = new Counter({
  name: `${config.metrics.prefix}auth_failures_total`,
  help: "Total de falhas de autenticação",
  labelNames: ["reason", "route"],
  registers: [registry],
});
