# API Gateway — Node.js

Gateway de API reverso com rate limiting, circuit breaker e service discovery, construído do zero com Node.js + TypeScript.

## Fases

| Fase | Status | Descrição |
|------|--------|-----------|
| 1 | ✅ | Esqueleto: Express + métricas Prometheus + health checks |
| 2 | 🔜 | Reverse proxy + load balancer + service registry |
| 3 | 🔜 | Rate limiting (Token Bucket via Redis) |
| 4 | 🔜 | Circuit Breaker manual (CLOSED/OPEN/HALF_OPEN) |
| 5 | 🔜 | Auth middleware (JWT + API Key) |
| 6 | 🔜 | Dashboards Grafana completos + alertas |

## Setup rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example gateway/.env

# 3. Subir infraestrutura (Redis, Consul, Prometheus, Grafana)
npm run infra:up

# 4. Rodar o gateway em dev
npm run dev
```

## URLs

| Serviço | URL |
|---------|-----|
| Gateway | http://localhost:3000 |
| Health | http://localhost:3000/health |
| Ready | http://localhost:3000/ready |
| Metrics | http://localhost:3000/metrics |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin/admin) |
| Consul UI | http://localhost:8500 |
| Redis Insight | http://localhost:5540 |

## Endpoints da Fase 1

```
GET /health    → liveness probe
GET /ready     → readiness probe
GET /metrics   → Prometheus scrape endpoint
GET /info      → informações da instância
```

## Testes

```bash
cd gateway
npm test
```

## Estrutura

```
gateway/src/
├── index.ts              # Bootstrap do servidor + graceful shutdown
├── app.ts                # Factory do Express app (separado para testes)
├── config/
│   ├── index.ts          # Configuração centralizada com validação
│   └── logger.ts         # Logger estruturado (Winston)
└── middleware/
    ├── metrics.ts         # Registry Prometheus + todas as métricas
    ├── requestId.ts       # Injeção de ID + coleta de métricas HTTP
    └── errorHandler.ts    # Handler de erros padronizado + 404
```
