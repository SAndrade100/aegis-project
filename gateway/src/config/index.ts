import "dotenv/config";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  env: (process.env.NODE_ENV ?? "development") as "development" | "production" | "test",
  port: parseInt(process.env.PORT ?? "3000", 10),

  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB ?? "0", 10),
  },

  auth: {
    jwtSecret: requireEnv("JWT_SECRET", "dev-secret-change-in-production"),
    apiKeyHeader: process.env.API_KEY_HEADER ?? "x-api-key",
  },

  rateLimit: {
    // tokens por segundo por IP (padrão)
    defaultRate: parseInt(process.env.RATE_LIMIT_DEFAULT ?? "100", 10),
    // capacidade máxima do bucket
    defaultBurst: parseInt(process.env.RATE_LIMIT_BURST ?? "200", 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
  },

  circuitBreaker: {
    failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD ?? "5", 10),
    successThreshold: parseInt(process.env.CB_SUCCESS_THRESHOLD ?? "2", 10),
    timeout: parseInt(process.env.CB_TIMEOUT_MS ?? "10000", 10),
    halfOpenRequests: parseInt(process.env.CB_HALF_OPEN_REQUESTS ?? "3", 10),
  },

  proxy: {
    timeout: parseInt(process.env.PROXY_TIMEOUT_MS ?? "30000", 10),
  },

  consul: {
    host: process.env.CONSUL_HOST ?? "localhost",
    port: parseInt(process.env.CONSUL_PORT ?? "8500", 10),
  },

  metrics: {
    path: process.env.METRICS_PATH ?? "/metrics",
    prefix: process.env.METRICS_PREFIX ?? "api_gateway_",
  },

  logging: {
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  },
} as const;

export type Config = typeof config;
