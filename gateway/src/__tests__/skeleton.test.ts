import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import type { Express } from "express";

describe("API Gateway — Fase 1: Esqueleto", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  // ─── /health ──────────────────────────────────────────────────────────────
  describe("GET /health", () => {
    it("retorna 200 com status ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });

    it("inclui uptime e timestamp", async () => {
      const res = await request(app).get("/health");
      expect(res.body).toHaveProperty("uptime");
      expect(res.body).toHaveProperty("timestamp");
      expect(typeof res.body.uptime).toBe("number");
    });
  });

  // ─── /ready ───────────────────────────────────────────────────────────────
  describe("GET /ready", () => {
    it("retorna 200 quando gateway está pronto", async () => {
      const res = await request(app).get("/ready");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
    });

    it("inclui checks de saúde", async () => {
      const res = await request(app).get("/ready");
      expect(res.body).toHaveProperty("checks");
      expect(res.body.checks.gateway).toBe("ok");
    });
  });

  // ─── /metrics ─────────────────────────────────────────────────────────────
  describe("GET /metrics", () => {
    it("retorna métricas em formato Prometheus", async () => {
      const res = await request(app).get("/metrics");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/plain/);
    });

    it("expõe métricas padrão do Node.js", async () => {
      const res = await request(app).get("/metrics");
      expect(res.text).toContain("nodejs_");
    });

    it("expõe métricas customizadas do gateway", async () => {
      // Faz uma request antes para garantir que os contadores existam
      await request(app).get("/health");
      const res = await request(app).get("/metrics");
      expect(res.text).toContain("api_gateway_http_requests_total");
    });
  });

  // ─── /info ────────────────────────────────────────────────────────────────
  describe("GET /info", () => {
    it("retorna informações da instância", async () => {
      const res = await request(app).get("/info");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name", "api-gateway");
      expect(res.body).toHaveProperty("node");
      expect(res.body).toHaveProperty("memory");
      expect(res.body).toHaveProperty("config");
    });
  });

  // ─── Request ID ───────────────────────────────────────────────────────────
  describe("Request ID middleware", () => {
    it("injeta x-request-id no response", async () => {
      const res = await request(app).get("/health");
      expect(res.headers["x-request-id"]).toBeDefined();
      // Deve ser um UUID v4
      expect(res.headers["x-request-id"]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("preserva x-request-id enviado pelo cliente", async () => {
      const clientId = "my-custom-request-id";
      const res = await request(app)
        .get("/health")
        .set("x-request-id", clientId);
      expect(res.headers["x-request-id"]).toBe(clientId);
    });
  });

  // ─── 404 handler ─────────────────────────────────────────────────────────
  describe("Rota inexistente", () => {
    it("retorna 404 estruturado", async () => {
      const res = await request(app).get("/nao-existe");
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(res.body.error).toHaveProperty("requestId");
    });
  });
});
