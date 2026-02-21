# Backend Startup Guide

## ✅ Pre-flight Checklist

All issues resolved! Here's how to start the backend:

### 1. Start Docker Services
```powershell
# From project root
docker-compose up -d

# Verify containers are running
docker ps
```

**Expected output:**
- `fantasy-union-db` (PostgreSQL) - Up
- `fantasy-union-redis` (Redis) - Up

### 2. Generate Prisma Client
```powershell
cd packages/backend
npm run db:generate
```

### 3. Run Database Migrations
```powershell
npm run db:migrate
```

### 4. Seed Database
```powershell
npm run db:seed
```

**Expected output:**
- ✅ Tenant created: The Rugby Championship 2025
- ✅ 4 squads seeded
- ✅ 198 players seeded
- ✅ 1 tournament seeded
- ✅ 6 rounds seeded
- ✅ Gameweek state initialized

### 5. Start Backend Server
```powershell
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
docker-compose down
docker-compose up -d
```

### Database connection errors?
```powershell
# Check containers
docker ps

# Check logs
docker logs fantasy-union-db
docker logs fantasy-union-redis
```

### Port already in use?
```powershell
# Check what's using port 3001
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Redis connection errors?
Check REDIS_HOST and REDIS_PORT in `.env` match docker-compose.yml

## 📝 Next Steps

1. ✅ All 11 backend tasks complete
2. ✅ Authentication implemented (Clerk with JWT verification)
3. 🔜 Test frontend integration
4. 🔜 Deploy to production

## 🎯 All Issues Fixed

- ✅ TypeScript build errors resolved
- ✅ Linting issues fixed (replaceAll, RegExp.exec, localeCompare)
- ✅ Top-level await in seed script
- ✅ Environment variables updated (REDIS_HOST/PORT vs REDIS_URL)
- ✅ Rate limiting with Redis
- ✅ Checksum endpoint working
- ✅ Auto-lock background jobs
- ✅ Audit trail middleware
- ✅ Multi-tenant architecture
