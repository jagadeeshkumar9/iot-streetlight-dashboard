# File Structure

```
iot-streetlight-dashboard/
├── docker-compose.yml           # Main Docker Compose configuration
├── .env.example                 # Environment variables template
├── README.md                    # Main documentation
│
├── mqtt/                        # MQTT Broker Configuration
│   └── mosquitto.conf          # Mosquitto configuration
│
├── mqtt-bridge/                 # MQTT to Supabase Bridge Service
│   ├── package.json
│   ├── index.js                # Main bridge service
│   ├── Dockerfile
│   └── README.md
│
├── backend/                     # Backend API Server
│   ├── package.json
│   ├── index.js                # Express API server
│   ├── Dockerfile
│   ├── API-DOCS.md            # API documentation
│   └── .env                    # Backend environment config
│
├── frontend/                    # React Dashboard
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf              # Nginx config for production
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js              # Main React component
│       ├── index.js
│       ├── index.css           # Tailwind CSS
│       └── api/
│           └── axios.js        # API client
│
├── docs/                        # Documentation
│   ├── SUPABASE-SCHEMA.md      # Database schema setup
│   └── AWS-DEPLOYMENT.md       # AWS production deployment
│
├── device/                      # IoT Device Firmware
│   └── streetlight-1b81b8d0.ino # ESP32 Arduino code
│
└── grafana/                     # Grafana Configuration (Optional)
    └── provisioning/           # Grafana dashboards & datasources
```

# Branch Structure

- **main**: Main branch with documentation and Docker setup
- **docker-deployment**: Docker Compose and infrastructure files
- **backend-setup**: Backend API and MQTT bridge services
- **frontend-dashboard**: React dashboard and UI

