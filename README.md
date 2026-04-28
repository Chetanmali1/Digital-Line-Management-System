# 🎯 Digital Line Management System
## Enterprise-Grade Documentation & Deployment Guide

---

## 📁 Project Structure

```
queue-system/
├── server/                    # Node.js Express Backend
│   ├── config/
│   │   ├── database.js        # MongoDB Atlas connection
│   │   ├── redis.js           # Redis cache (with graceful fallback)
│   │   └── swagger.js         # OpenAPI 3.0 docs setup
│   ├── models/
│   │   ├── User.js            # User + Admin model (role-based)
│   │   ├── ServiceCounter.js  # Counter with dynamic avg tracking
│   │   ├── Queue.js           # Queue entry with auto token generation
│   │   └── QueueHistory.js    # Daily analytics aggregation
│   ├── routes/
│   │   ├── auth.js            # Registration, Login, JWT
│   │   ├── counters.js        # CRUD counters, serve-next
│   │   ├── queue.js           # Join, cancel, live status
│   │   ├── analytics.js       # Dashboard, trends, peak hours
│   │   └── ai.js              # AI predictions, load balancing
│   ├── middleware/
│   │   └── auth.js            # JWT verify, role authorization
│   ├── utils/
│   │   ├── aiEngine.js        # AI wait time + OpenAI integration
│   │   ├── socketHandler.js   # Socket.io event management
│   │   └── logger.js          # Winston structured logging
│   ├── index.js               # Main server entry point
│   ├── Dockerfile
│   └── .env.example
│
├── client/                    # React.js Frontend
│   ├── src/
│   │   ├── App.js             # Complete SPA (single-file architecture)
│   │   └── index.js           # React entry point
│   ├── public/
│   │   └── index.html
│   ├── Dockerfile
│   ├── nginx.conf             # SPA routing + security headers
│   └── package.json
│
├── docker/
│   └── mongo-init.js          # MongoDB initialization script
│
├── docker-compose.yml         # Full-stack orchestration
├── .env.example               # Root env template
└── README.md                  # This file
```

---

## 🗄️ ER Diagram (Entity Relationship)

```
┌─────────────┐          ┌──────────────────┐
│    Users    │          │  ServiceCounters  │
├─────────────┤          ├──────────────────┤
│ _id (PK)    │    ┌────►│ _id (PK)         │
│ name        │    │     │ counterName       │
│ email       │    │     │ counterNumber     │
│ password    │    │     │ serviceType       │
│ role        │    │     │ isActive          │
│ phone       │    │     │ avgServiceTime    │
│ isActive    │    │     │ maxCapacity       │
│ lastLogin   │    │     │ totalServed       │
│ createdAt   │    │     │ serviceTimeHistory│
└─────────────┘    │     └──────────────────┘
      │            │               │
      │ 1:N        │               │ 1:N
      ▼            │               ▼
┌─────────────┐    │     ┌──────────────────┐
│   Queues    │    │     │  Queues (Ref)    │
├─────────────┤    │     └──────────────────┘
│ _id (PK)    │    │
│ userId (FK) │────┘
│ counterId   │────► ServiceCounter
│ tokenNumber │ (unique)
│ position    │
│ status      │ waiting|serving|served|cancelled|no-show
│ estimatedWait│
│ actualWait  │
│ joinedAt    │
│ calledAt    │
│ servedAt    │
│ qrCode      │ (base64 data URL)
│ aiPredicted │
└─────────────┘
      │
      │ aggregated daily by cron/API
      ▼
┌─────────────────┐
│  QueueHistory   │
├─────────────────┤
│ _id (PK)        │
│ date (unique)   │
│ totalUsers      │
│ totalServed     │
│ totalCancelled  │
│ avgWaitTime     │
│ hourlyBreakdown │ array[{hour, count, avgWait}]
│ peakHour        │
│ counterStats    │ array[{counterId, served, avgTime}]
│ aiInsights      │ {predictedPeakHours, recommendations}
└─────────────────┘
```

---

## 🤖 AI Logic Explained

### Basic Formula
```
Estimated Wait = People Ahead × Avg Service Time
```

### Advanced AI Formula
```
AI Wait = People Ahead × Avg Service Time
         × Service Type Multiplier      (e.g. consultation=1.5x, express=0.6x)
         × Time-of-Day Multiplier       (peak hours=1.2-1.3x, off-peak=1.0x)
         × Variability Buffer           (1.10-1.15x for real-world variance)
```

### Service Multipliers
| Service Type | Multiplier |
|---|---|
| express | 0.6x (fastest) |
| premium | 0.8x |
| general | 1.0x (baseline) |
| billing | 1.2x |
| registration | 1.1x |
| support | 1.3x |
| consultation | 1.5x (longest) |

### Peak Hour Detection
- Analyzes last 30 days of queue data
- Groups by hour-of-day
- Top 3 hours = peak hours
- Displayed with ⚠️ warnings and staffing recommendations

### OpenAI Integration
- Sends counter history + queue length to GPT-3.5
- Returns: predicted wait time + confidence + reasoning
- Falls back to rule-based if API unavailable
- `/api/ai/analyze-trends` runs full trend analysis with GPT

---

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repo-url>
cd queue-system

# Copy environment files
cp .env.example .env
cp server/.env.example server/.env

# Edit .env with your values (MongoDB URI, JWT secret, OpenAI key)
```

### 2. Run with Docker (Recommended)
```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f server

# Access:
# Frontend: http://localhost:3000
# API: http://localhost:5000
# Swagger: http://localhost:5000/api-docs
```

### 3. Run Locally (Development)
```bash
# Terminal 1 - Backend
cd server
npm install
cp .env.example .env  # Edit with your values
npm run dev

# Terminal 2 - Frontend
cd client
npm install
npm start
```

---

## 🔐 Security Architecture

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs with salt rounds=12 |
| Authentication | JWT Bearer tokens (7d expiry) |
| Authorization | Role-based middleware (user/admin) |
| Rate limiting | 100 requests/15min per IP |
| Helmet.js | Security HTTP headers |
| Input validation | express-validator on all routes |
| Non-root Docker | Custom user in container |
| CORS | Whitelisted origin only |

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login → JWT |
| GET | /api/auth/me | Current user |
| POST | /api/auth/admin/create | Create admin (admin only) |

### Counters (Admin Protected)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/counters | List all counters |
| POST | /api/counters | Create counter |
| PUT | /api/counters/:id | Update counter |
| DELETE | /api/counters/:id | Delete counter |
| POST | /api/counters/:id/serve-next | Call next customer |

### Queue
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/queue/join | Join queue |
| GET | /api/queue/my-status | My queue status |
| GET | /api/queue/live | Live overview all counters |
| GET | /api/queue/token/:token | Lookup by token |
| POST | /api/queue/:id/cancel | Cancel entry |

### Analytics (Admin)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/analytics/dashboard | KPI metrics |
| GET | /api/analytics/trends | Time series data |
| GET | /api/analytics/peak-hours | Hourly heatmap |

### AI
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/ai/wait-time/:counterId | AI wait prediction |
| GET | /api/ai/peak-hours | Peak hour detection |
| GET | /api/ai/load-balancing | Counter suggestions |
| POST | /api/ai/analyze-trends | Full OpenAI analysis |

---

## 📮 Postman Examples

### Join Queue
```json
POST /api/queue/join
Authorization: Bearer <token>
{
  "counterId": "6739c8e14b23a4f200000001"
}
```

### Create Counter
```json
POST /api/counters
Authorization: Bearer <admin-token>
{
  "counterName": "Billing Counter A",
  "serviceType": "billing",
  "avgServiceTime": 8,
  "maxCapacity": 30,
  "staffName": "John Smith"
}
```

---

## ⚡ Redis Caching Strategy

| Cache Key | TTL | Data |
|---|---|---|
| `counters:all` | 15s | All counter list |
| `queue:live` | 10s | Live queue overview |
| `analytics:dashboard` | 30s | KPI metrics |
| `analytics:trends:N` | 5min | Trend chart data |
| `analytics:peak-hours` | 10min | Hourly heatmap |
| `ai:wait:{counterId}` | 30s | AI prediction |
| `ai:peak-hours` | 1hr | Peak hour analysis |
| `ai:trends-analysis` | 1hr | Full AI insights |

Redis gracefully degrades: if unavailable, all requests go to MongoDB.

---

## 🔌 Socket.io Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `subscribe:counter` | counterId | Watch a specific counter |
| `subscribe:live` | - | Watch all counter updates |
| `subscribe:admin` | - | Admin dashboard stream |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `queue:joined` | {counterId, position} | New user joined |
| `queue:calling` | {token, counterId} | Customer being called |
| `queue:served` | {queueId} | Customer served |
| `queue:update` | {totalInQueue} | Counter queue changed |
| `user:{id}:called` | {token} | Personal notification |
| `counter:created` | counter | New counter added |
| `counter:updated` | counter | Counter modified |
| `counter:deleted` | {id} | Counter removed |

---

## 🌐 Production Deployment (AWS/GCP/Azure)

### Recommended Architecture
```
Internet → CloudFlare (CDN + WAF)
         → Load Balancer (AWS ALB)
         → ECS/K8s Cluster
              ├── Frontend (Nginx containers)
              ├── Backend API (Node.js containers)
              └── Socket.io (with Redis adapter for multi-instance)
         → MongoDB Atlas (managed)
         → ElastiCache Redis (managed)
```

### Environment Variables Checklist
- [ ] `MONGODB_URI` → Atlas connection string
- [ ] `REDIS_URL` → Managed Redis URL
- [ ] `JWT_SECRET` → 64-char random string
- [ ] `OPENAI_API_KEY` → OpenAI key
- [ ] `NODE_ENV=production`
- [ ] `CLIENT_URL` → Production frontend URL

### Scale Horizontally
For multiple API instances, add Socket.io Redis adapter:
```bash
npm install @socket.io/redis-adapter
```
```js
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(pubClient, subClient));
```

---

## 🧪 Testing

```bash
# Backend unit tests
cd server && npm test

# Test API manually
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

---

*Built with ❤️ — Enterprise-grade, startup-ready, AI-powered.*
