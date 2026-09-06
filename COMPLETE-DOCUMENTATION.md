# IoT Streetlight Dashboard - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Components](#components)
4. [Quick Start](#quick-start)
5. [Technology Stack](#technology-stack)
6. [API Endpoints](#api-endpoints)
7. [Dashboard Features](#dashboard-features)
8. [Deployment](#deployment)
9. [Security](#security)
10. [Monitoring](#monitoring)
11. [Troubleshooting](#troubleshooting)
12. [Cost Analysis](#cost-analysis)

---

## Overview

This is a complete IoT monitoring and control system for street lights featuring:

- **Device Code**: ESP32 + SIM7600 with MQTT connectivity
- **MQTT Broker**: Mosquitto (Docker)
- **Data Bridge**: Node.js service connecting MQTT → Supabase
- **Backend API**: Express.js with real-time WebSocket support
- **Frontend Dashboard**: React with Recharts for visualization
- **Database**: Supabase (PostgreSQL + Realtime)
- **Deployment**: Docker Compose locally, ECS/Fargate on AWS

**Repository**: https://github.com/jagadeeshkumar9/iot-streetlight-dashboard

---

## System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│         ESP32 + SIM7600 Streetlight Device          │
│  (Publishes: voltage, current, power, temperature)  │
└──────────────────────┬──────────────────────────────┘
                       │ MQTT (1883)
                       ↓
        ┌──────────────────────────────┐
        │   Mosquitto MQTT Broker      │ (Docker)
        │   - Pub/Sub messaging        │
        │   - WebSocket support        │
        └──────────────┬───────────────┘
                       │
        ┌──────────────↓───────────────┐
        │  MQTT-Supabase Bridge        │ (Node.js)
        │  - Subscribes to topics      │
        │  - Stores in PostgreSQL      │
        └──────────────┬───────────────┘
                       │
        ┌──────────────↓───────────────┐
        │  Supabase PostgreSQL         │
        │  - Real-time database        │
        │  - Row-level security        │
        └──────────────┬───────────────┘
                       │
        ┌──────────────↓───────────────┐
        │  Backend API (Express.js)    │
        │  - REST endpoints            │
        │  - WebSocket for real-time   │
        │  - Device control commands   │
        └──────────────┬───────────────┘
                       │
        ┌──────────────↓───────────────┐
        │  React Dashboard             │
        │  - Real-time charts          │
        │  - Device control            │
        │  - Analytics & statistics    │
        └──────────────────────────────┘
```

### AWS Production Architecture

```
┌──────────────────────────────────────────────┐
│          Route 53 (DNS)                      │
└─────────────────────┬────────────────────────┘
                      │
         ┌────────────▼────────────┐
         │   CloudFront CDN        │
         │  (Frontend Distribution)│
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │   Application Load      │
         │   Balancer (ALB)        │
         └────────────┬────────────┘
                      │
    ┌─────────────────┴─────────────────┐
    │                                   │
┌───▼────────────┐          ┌──────────▼─────┐
│  ECS Cluster   │          │  S3 + CDN      │
│  - Backend API │          │  - Frontend    │
│  - MQTT Bridge │          │  - Assets      │
└───┬────────────┘          └────────────────┘
    │
    └─────────────────┬──────────────────────
                      │
         ┌────────────▼────────────┐
         │  Supabase RDS           │
         │  (PostgreSQL)           │
         │  - Realtime             │
         │  - Auth                 │
         └─────────────────────────┘
```

---

## Components

### 1. IoT Device (ESP32 + SIM7600)

**Published Data (every 5 seconds)**:
```json
{
  "device": "streetlight-1b81b8d0",
  "time": "18:30:45",
  "voltage": 230.5,
  "current": 0.85,
  "power": 185.2,
  "energy": 1234.56,
  "frequency": 50.0,
  "pf": 0.95,
  "temperature": 45.2,
  "latitude": 13.0827,
  "longitude": 80.2707,
  "relay": true,
  "door": false,
  "signal": 23,
  "network": true,
  "gprs": true,
  "mqtt": true,
  "simCard": {
    "iccid": "8991401200003157518F",
    "imsi": "404010712345678",
    "imei": "868322050012345",
    "operator": "Airtel"
  }
}
```

**MQTT Topics**:
- `streetlight/streetlight-1b81b8d0/status` - Device status & sensor data
- `streetlight/streetlight-1b81b8d0/control` - Receive commands
- `streetlight/streetlight-1b81b8d0/alert` - Alerts & OTA status
- `streetlight/streetlight-1b81b8d0/ota` - Firmware updates

### 2. MQTT Broker (Mosquitto)

**Port**: 1883 (MQTT), 9001 (WebSocket)
**Configuration**: `mqtt/mosquitto.conf`
**Features**:
- Pub/Sub messaging
- Message persistence
- Anonymous connections (configurable)
- Logging
- Max connections: unlimited

### 3. MQTT-Supabase Bridge

**Service**: Node.js application
**Responsibilities**:
- Subscribes to `streetlight/#` topics
- Parses JSON payloads
- Inserts data into Supabase
- Health monitoring
- Error tracking

**Endpoints**:
- `GET /health` - Service status
- `GET /status` - Connection details

### 4. Backend API (Express.js)

**Port**: 5000
**Features**:
- MQTT client integration
- Supabase connectivity
- WebSocket for real-time updates
- REST API endpoints
- JWT authentication
- Comprehensive logging

### 5. Frontend Dashboard (React)

**Port**: 3000
**Features**:
- Real-time sensor monitoring
- Multi-device support
- Historical charts
- Device control
- Statistics & analytics
- Dark theme UI
- Responsive design

### 6. Database (Supabase PostgreSQL)

**Tables**:
- `sensor_data` - All sensor readings
- `devices` - Device configuration
- `device_alerts` - Alert history
- `audit_logs` - User actions

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Supabase account and API keys
- Git
- Node.js 18+ (for local development)

### Step-by-Step Setup

**1. Clone Repository**
```bash
git clone https://github.com/jagadeeshkumar9/iot-streetlight-dashboard.git
cd iot-streetlight-dashboard
```

**2. Configure Environment**
```bash
cp .env.example .env
nano .env
```

Edit with your Supabase credentials:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secret-key-here
MQTT_BROKER=mqtt://mqtt-broker:1883
```

**3. Create Database Schema**

Run SQL from `docs/SUPABASE-SCHEMA.md` in Supabase SQL editor.

**4. Start Services**
```bash
docker-compose up -d
```

**5. Verify Services**
```bash
docker-compose ps
```

**6. Access Applications**
- Dashboard: http://localhost:3000
- Backend API: http://localhost:5000
- MQTT: mqtt://localhost:1883
- Grafana (optional): http://localhost:3001

### Verify Installation

```bash
# Check MQTT broker
mosquitto_sub -h localhost -t "test" &
mosquitto_pub -h localhost -t "test" -m "hello"

# Check backend health
curl http://localhost:5000/api/health

# Check MQTT bridge
curl http://localhost:3001/health
```

---

## Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|----------|
| **Device** | ESP32 | - | Microcontroller |
| **Modem** | SIM7600 | - | 4G/LTE connectivity |
| **Protocol** | MQTT | 3.1.1 | Message protocol |
| **Broker** | Mosquitto | Latest | MQTT server |
| **Bridge** | Node.js | 18+ | MQTT-DB bridge |
| **Backend** | Express.js | 4.18+ | API server |
| **Frontend** | React | 18+ | Dashboard UI |
| **Database** | PostgreSQL | 14+ | Data storage |
| **Realtime** | Supabase | - | Backend services |
| **Charts** | Recharts | 2.10+ | Data visualization |
| **Styling** | Tailwind CSS | 3.3+ | UI styling |
| **WebSocket** | Socket.io | 4.7+ | Real-time updates |
| **Container** | Docker | 20+ | Containerization |
| **Orchestration** | Docker Compose | 2.0+ | Service orchestration |
| **Cloud** | AWS | - | Production hosting |
| **Compute** | ECS Fargate | - | Serverless containers |
| **CDN** | CloudFront | - | Content delivery |

---

## API Endpoints

### Health & Status

```http
GET /api/health
```
**Response**:
```json
{
  "status": "ok",
  "mqtt": "connected",
  "timestamp": "2026-09-06T10:30:00Z",
  "uptime": 3600
}
```

### Device Data

**Get Latest Data**
```http
GET /api/devices/{deviceId}/latest
```

**Get History**
```http
GET /api/devices/{deviceId}/history?hours=24
```

**List All Devices**
```http
GET /api/devices
```

**Get Statistics**
```http
GET /api/statistics/{deviceId}?hours=24
```

### Device Control

**Control Relay**
```http
POST /api/devices/{deviceId}/relay
Content-Type: application/json

{
  "action": "on"
}
```

**Set Schedule**
```http
POST /api/devices/{deviceId}/schedule
Content-Type: application/json

{
  "on_hour": 18,
  "on_min": 0,
  "off_hour": 6,
  "off_min": 0
}
```

**OTA Update**
```http
POST /api/devices/{deviceId}/ota
Content-Type: application/json

{
  "url": "https://example.com/firmware.bin"
}
```

### WebSocket Events

**Connect**
```javascript
const socket = io('http://localhost:5000');
```

**Subscribe to Device**
```javascript
socket.emit('subscribe_device', 'streetlight-1b81b8d0');
```

**Receive Real-time Data**
```javascript
socket.on('sensor_data', (data) => {
  console.log('New data:', data);
});
```

---

## Dashboard Features

### Real-Time Monitoring
- ✅ Live voltage, current, power readings
- ✅ Temperature monitoring
- ✅ Device status (relay, door sensor)
- ✅ Network connectivity status
- ✅ Signal quality indicator

### Visualization
- ✅ Voltage & Current trend charts (24-hour)
- ✅ Power consumption area chart
- ✅ Temperature history
- ✅ Frequency & Power factor metrics

### Device Control
- ✅ One-click relay ON/OFF
- ✅ Schedule configuration (set ON/OFF times)
- ✅ Manual refresh button
- ✅ Multi-device support with device selector

### Analytics
- ✅ Min/Max/Average calculations
- ✅ Statistical summaries (24-hour)
- ✅ Data point count
- ✅ Period-specific statistics

### User Interface
- ✅ Dark theme (gray-800 to gray-900)
- ✅ Responsive grid layout
- ✅ Color-coded status cards
- ✅ Gradient backgrounds
- ✅ Icon indicators (Lucide React)

---

## Deployment

### Local Deployment (Docker Compose)

**Start All Services**
```bash
docker-compose up -d
```

**View Logs**
```bash
docker-compose logs -f backend-api
docker-compose logs -f mqtt-supabase-bridge
```

**Stop Services**
```bash
docker-compose down
```

**Scale Services**
```bash
docker-compose up -d --scale backend-api=3
```

### AWS Production Deployment

See `docs/AWS-DEPLOYMENT.md` for:

**1. Setup ECR Repositories**
- Create ECR repos for backend, bridge, frontend
- Push Docker images

**2. Create VPC & Security Groups**
- VPC with subnets
- Security groups for ALB, ECS, RDS

**3. Setup ECS Cluster**
- Create Fargate cluster
- Create task definitions
- Configure services

**4. Configure Load Balancer**
- Application Load Balancer
- Target groups
- Listener rules

**5. Deploy Frontend**
- S3 bucket for static files
- CloudFront distribution
- Route 53 DNS

**6. Monitoring & Auto-Scaling**
- CloudWatch alarms
- Auto Scaling policies
- Log groups

### Database Setup

**Create Tables**
```sql
-- Run SQL from docs/SUPABASE-SCHEMA.md in Supabase console
```

**Enable Realtime**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;
```

**Enable Row Level Security**
```sql
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
```

---

## Security

### Device Security
- ✅ Unique device IDs
- ✅ SIM card authentication
- ✅ OTA firmware verification
- ✅ Scheduled reboots

### Network Security
- ✅ MQTT broker authentication (configurable)
- ✅ SSL/TLS encryption for HTTPS
- ✅ WebSocket secure connections (wss://)
- ✅ JWT token validation

### Database Security
- ✅ Supabase Row Level Security (RLS)
- ✅ Authenticated user policies
- ✅ Column-level encryption
- ✅ Audit logging

### AWS Security
- ✅ VPC isolation
- ✅ Security groups with least privilege
- ✅ Secrets Manager for credentials
- ✅ IAM roles and policies
- ✅ CloudTrail audit logs
- ✅ WAF (Web Application Firewall)

### Best Practices
- ✅ Environment variables for secrets
- ✅ No hardcoded credentials
- ✅ Regular security updates
- ✅ Monitoring and alerting
- ✅ Backup and disaster recovery

---

## Monitoring

### Health Checks

**Backend API**
```bash
curl http://localhost:5000/api/health
```

**MQTT Bridge**
```bash
curl http://localhost:3001/health
```

**MQTT Broker**
```bash
mosquitto_sub -h localhost -t "$SYS/broker/clients/connected"
```

### Logging

**View Service Logs**
```bash
docker-compose logs -f --tail=100
```

**Backend Logs**
```bash
# Combined log file
cat combined.log

# Error log file
cat error.log
```

### Metrics

**Collect with**:
- CloudWatch (AWS)
- Grafana (Optional)
- Prometheus (Advanced)

**Track**:
- API response times
- MQTT message throughput
- Database query times
- Memory/CPU usage
- Error rates

### Alerts

**Set up alerts for**:
- Service unavailability
- High CPU/Memory usage
- Database connection errors
- MQTT broker disconnections
- API error rate spike
- Slow query detection

---

## Troubleshooting

### MQTT Connection Issues

**Problem**: Device cannot connect to MQTT broker

**Solutions**:
1. Check broker is running: `docker-compose ps mqtt-broker`
2. Test connection: `mosquitto_sub -h localhost -t test`
3. Verify firewall: `sudo ufw allow 1883/tcp`
4. Check device IP/hostname configuration
5. Review broker logs: `docker-compose logs mqtt-broker`

### Data Not Appearing

**Problem**: Sensor data not showing in dashboard

**Solutions**:
1. Verify MQTT message: `mosquitto_sub -h localhost -t "streetlight/#"`
2. Check bridge health: `curl http://localhost:3001/health`
3. Verify Supabase connection in bridge logs
4. Confirm database schema exists
5. Check Supabase API keys in .env

### High Latency

**Problem**: Dashboard updates are slow

**Solutions**:
1. Reduce device publish frequency
2. Scale backend API: `docker-compose up -d --scale backend-api=3`
3. Enable database query caching
4. Use CDN for frontend (CloudFront)
5. Check network bandwidth

### WebSocket Disconnections

**Problem**: Real-time updates stopping

**Solutions**:
1. Check browser console for errors
2. Verify backend API is running
3. Check firewall WebSocket ports
4. Review backend logs
5. Restart backend service

---

## Cost Analysis

### Local Deployment
- **Hardware**: ~$500-1000 (one-time)
- **Internet**: ~$30-50/month
- **Total**: ~$30-50/month

### AWS Deployment

**Compute**
- ECS Fargate (2 tasks × 256 CPU × 512 MB): $50-100/month
- Data transfer: $5-10/month

**Networking**
- Application Load Balancer: $25/month
- Data processed: ~$5/month

**Database**
- Supabase Starter: $25-50/month
- (Includes 1 GB storage, unlimited API calls)

**Storage & CDN**
- S3 storage: ~$1/month
- CloudFront: $10-30/month (depends on traffic)
- Data transfer: $5-10/month

**Monitoring**
- CloudWatch: $5-15/month
- Optional Datadog: $30+/month

**Monthly Total**: $110-250/month

**Yearly Total**: $1,320-3,000/year

### Cost Optimization
- Use Fargate Spot (up to 70% savings)
- Reserved capacity for predictable load
- Archive old data to S3 Glacier
- Enable auto-scaling
- Use Supabase free tier in development

---

## Summary

This complete IoT streetlight dashboard provides:

✅ **Enterprise-Grade Architecture**: Scalable, secure, and production-ready
✅ **Real-Time Monitoring**: Live sensor data with WebSocket updates
✅ **Device Control**: Remote relay control and scheduling
✅ **Analytics**: Historical data and statistical analysis
✅ **Multiple Deployment Options**: Docker Compose (local) or AWS (cloud)
✅ **Comprehensive Documentation**: Setup, deployment, and troubleshooting guides
✅ **Security First**: Encryption, authentication, and audit logging
✅ **Cost-Effective**: Starting from $30/month for local or $110+/month for cloud

---

## Getting Started

1. Clone repository: `https://github.com/jagadeeshkumar9/iot-streetlight-dashboard.git`
2. Configure environment variables
3. Create database schema
4. Run `docker-compose up -d`
5. Access dashboard at `http://localhost:3000`
6. Deploy to AWS (see AWS guide)

---

**Last Updated**: September 6, 2026
**Author**: Jagadeesh Kumar
**License**: MIT
