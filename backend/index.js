const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const winston = require('winston');

dotenv.config();

// ==================== LOGGER SETUP ====================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// ==================== SUPABASE CLIENT ====================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ==================== EXPRESS APP ====================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== MQTT CONNECTION ====================
let mqttClient;
let isConnected = false;
const connectedDevices = new Map();

function connectMQTT() {
  const mqttBroker = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
  
  mqttClient = mqtt.connect(mqttBroker, {
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });

  mqttClient.on('connect', () => {
    logger.info('✅ Connected to MQTT Broker');
    isConnected = true;
    
    // Subscribe to all streetlight topics
    mqttClient.subscribe('streetlight/#', (err) => {
      if (err) {
        logger.error('❌ Subscribe error:', err);
      } else {
        logger.info('📥 Subscribed to streetlight/# topics');
      }
    });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const deviceId = payload.device || 'unknown';
      
      // Track connected devices
      connectedDevices.set(deviceId, {
        lastSeen: new Date(),
        topic: topic
      });

      // Store in Supabase
      await storeSensorData(payload);
      
      // Broadcast to connected WebSocket clients
      io.emit('sensor_data', {
        deviceId,
        data: payload,
        timestamp: new Date()
      });

      logger.debug(`📨 Message from ${deviceId}:`, payload);
    } catch (err) {
      logger.error('❌ Error processing MQTT message:', err);
    }
  });

  mqttClient.on('error', (err) => {
    logger.error('❌ MQTT Error:', err);
    isConnected = false;
  });

  mqttClient.on('disconnect', () => {
    logger.warn('⚠️  MQTT Disconnected');
    isConnected = false;
  });
}

// ==================== SUPABASE FUNCTIONS ====================
async function storeSensorData(data) {
  try {
    const { error } = await supabase
      .from('sensor_data')
      .insert([{
        device_id: data.device,
        voltage: data.voltage,
        current: data.current,
        power: data.power,
        energy: data.energy,
        frequency: data.frequency,
        power_factor: data.pf,
        temperature: data.temperature,
        latitude: data.latitude,
        longitude: data.longitude,
        relay_status: data.relay,
        door_status: data.door,
        signal_quality: data.signal,
        network_status: data.network,
        gprs_status: data.gprs,
        mqtt_status: data.mqtt,
        sim_iccid: data.simCard?.iccid,
        sim_imsi: data.simCard?.imsi,
        sim_imei: data.simCard?.imei,
        sim_operator: data.simCard?.operator,
        device_time: data.time,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      logger.error('❌ Supabase insert error:', error);
    } else {
      logger.debug('✅ Data stored in Supabase');
    }
  } catch (err) {
    logger.error('❌ Error storing sensor data:', err);
  }
}

async function getLatestDeviceData(deviceId) {
  try {
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      logger.error('Error fetching data:', error);
      return null;
    }
    return data;
  } catch (err) {
    logger.error('❌ Error:', err);
    return null;
  }
}

async function getDeviceHistory(deviceId, hours = 24) {
  try {
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('device_id', deviceId)
      .gte('created_at', fromDate)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching history:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    logger.error('❌ Error:', err);
    return [];
  }
}

// ==================== MIDDLEWARE ====================
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mqtt: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Get Latest Data for Device
app.get('/api/devices/:deviceId/latest', async (req, res) => {
  try {
    const data = await getLatestDeviceData(req.params.deviceId);
    res.json(data || { error: 'No data found' });
  } catch (err) {
    logger.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Get Device History
app.get('/api/devices/:deviceId/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const data = await getDeviceHistory(req.params.deviceId, hours);
    res.json(data);
  } catch (err) {
    logger.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get All Connected Devices
app.get('/api/devices', (req, res) => {
  const devices = Array.from(connectedDevices.entries()).map(([id, info]) => ({
    deviceId: id,
    lastSeen: info.lastSeen,
    topic: info.topic,
    status: 'connected'
  }));
  res.json(devices);
});

// Send Command to Device
app.post('/api/devices/:deviceId/command', (req, res) => {
  try {
    const { deviceId } = req.params;
    const command = req.body;

    const topic = `streetlight/${deviceId}/control`;
    const message = JSON.stringify(command);

    mqttClient.publish(topic, message, (err) => {
      if (err) {
        logger.error('Publish error:', err);
        return res.status(500).json({ error: 'Failed to send command' });
      }
      logger.info(`✅ Command sent to ${deviceId}:`, command);
      res.json({ success: true, message: 'Command sent' });
    });
  } catch (err) {
    logger.error('Error:', err);
    res.status(500).json({ error: 'Failed to send command' });
  }
});

// Control Relay (Turn ON/OFF)
app.post('/api/devices/:deviceId/relay', (req, res) => {
  try {
    const { deviceId } = req.params;
    const { action } = req.body; // 'on' or 'off'

    const command = {
      action: action === 'on' ? 'manual_on' : 'manual_off'
    };

    const topic = `streetlight/${deviceId}/control`;
    const message = JSON.stringify(command);

    mqttClient.publish(topic, message, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to control relay' });
      }
      logger.info(`✅ Relay ${action} for ${deviceId}`);
      res.json({ success: true, action, deviceId });
    });
  } catch (err) {
    logger.error('Error:', err);
    res.status(500).json({ error: 'Failed to control relay' });
  }
});

// Set Schedule
app.post('/api/devices/:deviceId/schedule', (req, res) => {
  try {
    const { deviceId } = req.params;
    const { on_hour, on_min, off_hour, off_min } = req.body;

    const command = {
      action: 'auto',
      on_hour,
      on_min,
      off_hour,
      off_min
    };

    const topic = `streetlight/${deviceId}/control`;
    const message = JSON.stringify(command);

    mqttClient.publish(topic, message, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to set schedule' });
      }
      logger.info(`✅ Schedule set for ${deviceId}`);
      res.json({ success: true, schedule: command });
    });
  } catch (err) {
    logger.error('Error:', err);
    res.status(500).json({ error: 'Failed to set schedule' });
  }
});

// OTA Update
app.post('/api/devices/:deviceId/ota', (req, res) => {
  try {
    const { deviceId } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }

    const command = { url };
    const topic = `streetlight/${deviceId}/ota`;
    const message = JSON.stringify(command);

    mqttClient.publish(topic, message, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to send OTA command' });
      }
      logger.info(`✅ OTA update initiated for ${deviceId}:`, url);
      res.json({ success: true, message: 'OTA update started' });
    });
  } catch (err) {
    logger.error('Error:', err);
    res.status(500).json({ error: 'Failed to initiate OTA' });
  }
});

// Get Statistics
app.get('/api/statistics/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    
    const data = await getDeviceHistory(deviceId, hours);
    
    if (data.length === 0) {
      return res.json({ error: 'No data available' });
    }

    const voltages = data.map(d => d.voltage);
    const currents = data.map(d => d.current);
    const powers = data.map(d => d.power);
    const temps = data.map(d => d.temperature);

    const stats = {
      voltage: {
        avg: (voltages.reduce((a, b) => a + b) / voltages.length).toFixed(2),
        min: Math.min(...voltages).toFixed(2),
        max: Math.max(...voltages).toFixed(2)
      },
      current: {
        avg: (currents.reduce((a, b) => a + b) / currents.length).toFixed(2),
        min: Math.min(...currents).toFixed(2),
        max: Math.max(...currents).toFixed(2)
      },
      power: {
        avg: (powers.reduce((a, b) => a + b) / powers.length).toFixed(2),
        min: Math.min(...powers).toFixed(2),
        max: Math.max(...powers).toFixed(2)
      },
      temperature: {
        avg: (temps.reduce((a, b) => a + b) / temps.length).toFixed(2),
        min: Math.min(...temps).toFixed(2),
        max: Math.max(...temps).toFixed(2)
      },
      dataPoints: data.length,
      period: `Last ${hours} hours`
    };

    res.json(stats);
  } catch (err) {
    logger.error('Error:', err);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

// ==================== SOCKET.IO EVENTS ====================
io.on('connection', (socket) => {
  logger.info(`✅ WebSocket client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`❌ WebSocket client disconnected: ${socket.id}`);
  });

  socket.on('subscribe_device', (deviceId) => {
    socket.join(`device_${deviceId}`);
    logger.info(`📡 Client subscribed to device: ${deviceId}`);
  });

  socket.on('unsubscribe_device', (deviceId) => {
    socket.leave(`device_${deviceId}`);
    logger.info(`📡 Client unsubscribed from device: ${deviceId}`);
  });
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 5000;

connectMQTT();

server.listen(PORT, () => {
  logger.info(`🚀 Backend API running on port ${PORT}`);
  logger.info(`📊 Supabase URL: ${process.env.SUPABASE_URL}`);
  logger.info(`📡 MQTT Broker: ${process.env.MQTT_BROKER}`);
});

module.exports = app;