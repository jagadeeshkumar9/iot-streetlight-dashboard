# IoT Streetlight Dashboard - Docker Deployment

## Quick Start

### 1. Prerequisites
- Docker & Docker Compose installed
- Supabase account and project
- AWS account (optional, for production)

### 2. Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access Points

- **Dashboard Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MQTT Broker**: mqtt://localhost:1883
- **MQTT WebSocket**: ws://localhost:9001
- **Grafana**: http://localhost:3001
- **InfluxDB**: http://localhost:8086

## Service Details

### MQTT Broker (Mosquitto)
Handles all IoT device connections and message routing.

### MQTT-Supabase Bridge
Subscribes to MQTT topics and stores data in Supabase PostgreSQL database.

### Backend API (Node.js + Express)
RESTful API for dashboard data, device control, and analytics.

### Frontend Dashboard (React)
Real-time monitoring and control interface.

### InfluxDB
Time-series database for metrics (optional).

### Grafana
Visualization and monitoring dashboards (optional).

## Health Checks

All services have health checks enabled. View status:

```bash
docker-compose ps
```

## Production Deployment

See AWS deployment guide in `docs/AWS-DEPLOYMENT.md`
