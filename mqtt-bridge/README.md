# MQTT to Supabase Bridge

This service acts as a bridge between MQTT broker and Supabase database.

## Features

✅ Subscribes to MQTT topics (streetlight/#)
✅ Parses JSON payloads from devices
✅ Stores data in Supabase PostgreSQL
✅ Health monitoring
✅ Error tracking and logging
✅ Automatic reconnection

## Setup

1. Configure environment variables (see `.env.example`)
2. Ensure Supabase table `sensor_data` exists
3. Start the service: `npm start`

## Health Check

```bash
curl http://localhost:3001/health
```

## Endpoints

- `GET /health` - Service health and statistics
- `GET /status` - Detailed connection status
