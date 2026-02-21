# Backend Startup Guide

## 🚀 First Time Setup

```powershell
docker compose up -d
npm run db:migrate --workspace=@spectatr/server
npm run db:seed --workspace=@spectatr/server
```

## ✅ Starting the Server

### 1. Start Docker
```powershell
docker compose up -d
```

### 2. Start the Server
```powershell
# Server only
npm run dev:server

# Or full stack (shared-types + server + ui)
npm run dev
```

**Expected output:**
```
🚀 Server running at http://localhost:3001
📡 tRPC endpoint: http://localhost:3001/trpc
📊 Checksum endpoint: http://localhost:3001/checksum.json
🏥 Health check: http://localhost:3001/health
🌍 Environment: development
🔗 CORS enabled for: http://localhost:5173
🛡️  Rate limiting enabled (Redis-backed)
⏰ Background jobs started
```

## 🧪 Test Endpoints

### Health Check
```powershell
curl http://localhost:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Checksum
```powershell
curl http://localhost:3001/checksum.json
```

Expected: `{"players":"...","rounds":"..."}`

### Players List (tRPC)
```powershell
curl -X POST http://localhost:3001/trpc/players.list `
  -H "Content-Type: application/json" `
  -d '{}'
```

## 🐛 Troubleshooting

### Docker not starting?
```powershell
docker compose down
docker compose up -d
```

### Database connection errors?
```powershell
# Check containers
docker ps

# Check logs
docker logs spectatr-db
docker logs spectatr-redis
```
