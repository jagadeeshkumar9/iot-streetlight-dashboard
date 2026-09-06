# Complete IoT Streetlight Dashboard - Setup Guide

## 📋 Overview

This is a complete IoT monitoring and control system for street lights with:

- **Device Code**: ESP32 + SIM7600 with MQTT connectivity
- **MQTT Broker**: Mosquitto (Docker)
- **Data Bridge**: Node.js service connecting MQTT → Supabase
- **Backend API**: Express.js with real-time WebSocket support
- **Frontend Dashboard**: React with Recharts for visualization
- **Database**: Supabase (PostgreSQL + Realtime)
- **Deployment**: Docker Compose locally, ECS/Fargate on AWS

---

## 🚀 Quick Start (Local with Docker)

### Prerequisites

- Docker & Docker Compose installed
- Supabase account and project
- Git

### 1. Clone Repository

```bash
git clone https://github.com/jagadeeshkumar9/iot-streetlight-dashboard.git
cd iot-streetlight-dashboard
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

Edit `.env` with your Supabase credentials:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secret-key
MQTT_BROKER=mqtt://mqtt-broker:1883
```

### 3. Create Supabase Database Schema

Run the SQL from `docs/SUPABASE-SCHEMA.md` in your Supabase SQL editor.

### 4. Start Docker Services

```bash
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 5. Access Applications

- **Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MQTT Broker**: mqtt://localhost:1883
- **Grafana** (optional): http://localhost:3001

---

## 📱 Device Configuration

Update your ESP32 firmware with:

```c
// Network Configuration
char apn[] = "airtelgprs.com";
const char* mqttServer = "YOUR_SERVER_IP";
const int mqttPort = 1883;
const char* deviceId = "streetlight-1b81b8d0";
```

---

## 🏗️ Architecture

### Data Flow

```
ESP32 Device
    ↓ (MQTT: streetlight/streetlight-1b81b8d0/status)
    ↓
MQTT Broker (Mosquitto)
    ↓
MQTT-Supabase Bridge
    ↓
Supabase PostgreSQL
    ↓
Backend API (Express)
    ↓
Frontend Dashboard (React)
```

### Device Data Published (every 5 seconds)

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

---

## 🎛️ Backend API Endpoints

### Health Check
```bash
GET /api/health
```

### Device Data
```bash
GET /api/devices/{deviceId}/latest
GET /api/devices/{deviceId}/history?hours=24
GET /api/devices
GET /api/statistics/{deviceId}?hours=24
```

### Device Control
```bash
POST /api/devices/{deviceId}/relay
Body: {"action": "on"}

POST /api/devices/{deviceId}/schedule
Body: {"on_hour": 18, "on_min": 0, "off_hour": 6, "off_min": 0}

POST /api/devices/{deviceId}/ota
Body: {"url": "https://example.com/firmware.bin"}
```

---

## 🎨 Frontend Features

✅ Real-time sensor data display
✅ Historical charts (voltage, current, power, temperature)
✅ Device control (relay ON/OFF)
✅ Schedule management
✅ Statistics & analytics
✅ Multi-device support
✅ WebSocket real-time updates
✅ Responsive design
✅ Dark theme UI

---

## 📊 Monitoring & Maintenance

### View MQTT Messages

```bash
# Connect to MQTT broker
mosquitto_sub -h localhost -t "streetlight/#"
```

### Check Bridge Health

```bash
curl http://localhost:3001/health
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend-api
docker-compose logs -f mqtt-supabase-bridge
```

### Database Queries

```sql
-- Latest data from device
SELECT * FROM sensor_data 
WHERE device_id = 'streetlight-1b81b8d0' 
ORDER BY created_at DESC 
LIMIT 10;

-- Statistics for last 24 hours
SELECT 
  AVG(voltage) as avg_voltage,
  MAX(voltage) as max_voltage,
  MIN(voltage) as min_voltage,
  AVG(current) as avg_current,
  AVG(power) as avg_power
FROM sensor_data 
WHERE device_id = 'streetlight-1b81b8d0' 
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## 🚀 Production Deployment

### AWS Deployment

See detailed guide: `docs/AWS-DEPLOYMENT.md`

Key steps:
1. Create ECR repositories
2. Push Docker images
3. Set up VPC and security groups
4. Create ECS cluster and Fargate tasks
5. Set up ALB and Route 53
6. Configure CloudFront for frontend
7. Set up monitoring and auto-scaling

### Cost Estimate (AWS ap-south-1)
- ECS Fargate: $50-100/month
- ALB: $25/month
- Supabase: $25-50/month
- **Total: ~$100-200/month**

---

## 🔒 Security Best Practices

- [ ] Enable MQTT authentication (username/password)
- [ ] Use SSL/TLS for all connections
- [ ] Enable Supabase Row Level Security (RLS)
- [ ] Use environment variables for secrets
- [ ] Enable CloudTrail for AWS audit logs
- [ ] Set up WAF rules
- [ ] Regular security updates
- [ ] Monitor and alert on suspicious activity

---

## 📝 Troubleshooting

### MQTT Connection Failed
```bash
# Check if broker is running
docker-compose ps mqtt-broker

# Test connection
mosquitto_sub -h localhost -t "test"
```

### Data Not Appearing in Dashboard
1. Check MQTT bridge health: `curl http://localhost:3001/health`
2. Verify device is publishing: `mosquitto_sub -h localhost -t "streetlight/#"`
3. Check Supabase connection in bridge logs
4. Verify database schema exists

### High Latency
1. Reduce publishing frequency on device
2. Scale backend API horizontally
3. Enable database query caching
4. Use CDN for frontend (CloudFront)

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [MQTT Documentation](https://mqtt.org/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Recharts Examples](https://recharts.org/examples)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Review service logs
3. Create GitHub issue with details
4. Include logs and error messages

---

## 📄 License

MIT License - See LICENSE file

---

## 👨‍💻 Author

**Jagadeesh Kumar**
- GitHub: [@jagadeeshkumar9](https://github.com/jagadeeshkumar9)
- Email: jgdsh99spam@gmail.com

---

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] SMS/Email alerts
- [ ] Advanced analytics and ML predictions
- [ ] Integration with other IoT platforms
- [ ] Multi-user authentication
- [ ] Role-based access control
- [ ] Data export (CSV, PDF)
- [ ] Custom report generation
