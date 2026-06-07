/**
 * Serviço A — mock simples para testar o gateway.
 * Simula um serviço de usuários com endpoints normais e com falhas.
 */
import express from "express";

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT ?? "4001", 10);
const SERVICE_NAME = "service-a";

// Simula latência aleatória para testes de métricas
function randomDelay(min = 10, max = 100) {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

app.get("/users", async (_req, res) => {
  await randomDelay();
  res.json({
    service: SERVICE_NAME,
    data: [
      { id: 1, name: "Alice", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" },
    ],
    timestamp: new Date().toISOString(),
  });
});

app.get("/users/:id", async (req, res) => {
  await randomDelay();
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  res.json({
    service: SERVICE_NAME,
    data: { id, name: `User ${id}`, email: `user${id}@example.com` },
  });
});

// Endpoint que sempre falha — para testar o circuit breaker na Fase 4
app.get("/users/fail", async (_req, res) => {
  await randomDelay(200, 500);
  res.status(500).json({ error: "Simulated failure", service: SERVICE_NAME });
});

// Endpoint lento — para testar timeout do proxy
app.get("/users/slow", async (_req, res) => {
  await randomDelay(5000, 10000);
  res.json({ message: "finally...", service: SERVICE_NAME });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] running on :${PORT}`);
});
