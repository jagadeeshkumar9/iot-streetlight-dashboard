# Backend API Documentation

## Health Check
```bash
GET /api/health
```
Response: Service status and MQTT connection state

## Device Endpoints

### Get Latest Data
```bash
GET /api/devices/{deviceId}/latest
```
Returns: Latest sensor readings

### Get Device History
```bash
GET /api/devices/{deviceId}/history?hours=24
```
Returns: Historical data for specified hours

### List All Connected Devices
```bash
GET /api/devices
```
Returns: Array of connected devices

## Control Endpoints

### Turn Relay ON/OFF
```bash
POST /api/devices/{deviceId}/relay
Body: {"action": "on"}
```

### Set Schedule
```bash
POST /api/devices/{deviceId}/schedule
Body: {
  "on_hour": 18,
  "on_min": 0,
  "off_hour": 6,
  "off_min": 0
}
```

### Send OTA Update
```bash
POST /api/devices/{deviceId}/ota
Body: {"url": "https://example.com/firmware.bin"}
```

## Analytics Endpoints

### Get Statistics
```bash
GET /api/statistics/{deviceId}?hours=24
```
Returns: Min, Max, Average for voltage, current, power, temperature

## WebSocket Events

### Connect
Automatically opens WebSocket connection

### Subscribe to Device
```javascript
socket.emit('subscribe_device', 'streetlight-1b81b8d0');
```

### Receive Real-time Data
```javascript
socket.on('sensor_data', (data) => {
  console.log('New data:', data);
});
```