const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const express = require('express');
const winston = require('winston');

dotenv.config();

// ==================== LOGGER ====================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'bridge.log' })
  ]
});

// ==================== SUPABASE CLIENT ====================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ==================== MQTT CLIENT ====================
let mqttClient;
let connectionStatus = {
  mqtt: false,
  supabase: false,
  messagesReceived: 0,
  messagesStored: 0,
  lastUpdate: null,
  errors: []
};

function connectMQTT() {
  const broker = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
  
  logger.info(`🔌 Connecting to MQTT Broker: ${broker}`);

  mqttClient = mqtt.connect(broker, {
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    clientId: `mqtt-bridge-${Date.now()}`
  });

  mqttClient.on('connect', () => {
    logger.info('✅ MQTT Connected');
    connectionStatus.mqtt = true;

    // Subscribe to streetlight topics
    const topic = process.env.MQTT_TOPIC || 'streetlight/#';
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        logger.error('❌ Subscribe error:', err);
        connectionStatus.errors.push(`Subscribe error: ${err.message}`);
      } else {
        logger.info(`📥 Subscribed to: ${topic}`);
      }
    });
  });

  mqttClient.on('message', async (topic, message) => {
    connectionStatus.messagesReceived++;
    connectionStatus.lastUpdate = new Date();

    try {
      const payload = JSON.parse(message.toString());
      logger.debug(`📨 Message received on ${topic}`);
      logger.debug('Payload:', payload);

      // Store in Supabase
      await storeData(payload, topic);
      connectionStatus.messagesStored++;
    } catch (err) {
      logger.error(`❌ Error processing message from ${topic}:`, err.message);
      connectionStatus.errors.push(`Parse error: ${err.message}`);
    }
  });

  mqttClient.on('error', (err) => {
    logger.error('❌ MQTT Error:', err.message);
    connectionStatus.mqtt = false;
    connectionStatus.errors.push(`MQTT error: ${err.message}`);
  });

  mqttClient.on('offline', () => {
    logger.warn('⚠️  MQTT Offline');
    connectionStatus.mqtt = false;
  });

  mqttClient.on('end', () => {
    logger.info('🔌 MQTT Connection ended');
    connectionStatus.mqtt = false;
  });
}

// ==================== SUPABASE STORAGE ====================
async function storeData(payload, topic) {
  try {
    // Validate Supabase connection
    const { error: testError } = await supabase
      .from('sensor_data')
      .select('count()', { count: 'exact', head: true });

    if (testError) {
      logger.error('❌ Supabase connection test failed:', testError);
      connectionStatus.supabase = false;
      connectionStatus.errors.push(`Supabase error: ${testError.message}`);
      return;
    }

    connectionStatus.supabase = true;

    // Prepare data for insertion
    const record = {
      device_id: payload.device || 'unknown',
      topic: topic,
      voltage: payload.voltage || null,
      current: payload.current || null,
      power: payload.power || null,
      energy: payload.energy || null,
      frequency: payload.frequency || null,
      power_factor: payload.pf || null,
      temperature: payload.temperature || null,
      latitude: payload.latitude || null,
      longitude: payload.longitude || null,
      relay_status: payload.relay || false,
      door_status: payload.door || false,
      signal_quality: payload.signal || null,
      network_status: payload.network || false,
      gprs_status: payload.gprs || false,
      mqtt_status: payload.mqtt || false,
      sim_iccid: payload.simCard?.iccid || null,
      sim_imsi: payload.simCard?.imsi || null,
      sim_imei: payload.simCard?.imei || null,
      sim_operator: payload.simCard?.operator || null,
      device_time: payload.time || null,
      created_at: new Date().toISOString()
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('sensor_data')
      .insert([record]);

    if (error) {
      logger.error('❌ Supabase insert error:', error);
      connectionStatus.errors.push(`Insert error: ${error.message}`);
    } else {
      logger.info(`✅ Data stored for device: ${payload.device}`);
    }
  } catch (err) {
    logger.error('❌ Error storing data:', err.message);
    connectionStatus.errors.push(`Store error: ${err.message}`);
  }
}

// ==================== EXPRESS APP (HEALTH CHECK) ====================
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    mqtt: connectionStatus.mqtt ? 'connected' : 'disconnected',
    supabase: connectionStatus.supabase ? 'connected' : 'disconnected',
    stats: {
      messagesReceived: connectionStatus.messagesReceived,
      messagesStored: connectionStatus.messagesStored,
      lastUpdate: connectionStatus.lastUpdate
    },
    recentErrors: connectionStatus.errors.slice(-5) // Last 5 errors
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json(connectionStatus);
});

// ==================== STARTUP ====================
app.listen(PORT, () => {
  logger.info(`🚀 MQTT-Supabase Bridge running on port ${PORT}`);
  logger.info(`📡 MQTT Broker: ${process.env.MQTT_BROKER}`);
  logger.info(`🔐 Supabase: ${process.env.SUPABASE_URL}`);
  logger.info(`📥 Topic: ${process.env.MQTT_TOPIC}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
});

connectMQTT();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Shutting down gracefully...');
  if (mqttClient) {
    mqttClient.end(() => {
      logger.info('✅ MQTT disconnected');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
