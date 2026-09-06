# Supabase SQL Schema for IoT Streetlight Dashboard

## Create sensor_data table

```sql
CREATE TABLE sensor_data (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL,
  topic VARCHAR(255),
  
  -- Electrical measurements
  voltage DECIMAL(8,2),
  current DECIMAL(8,3),
  power DECIMAL(10,2),
  energy DECIMAL(12,3),
  frequency DECIMAL(5,2),
  power_factor DECIMAL(3,2),
  
  -- Environmental
  temperature DECIMAL(5,2),
  
  -- Location
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6),
  
  -- Device Status
  relay_status BOOLEAN,
  door_status BOOLEAN,
  
  -- Network Status
  signal_quality INTEGER,
  network_status BOOLEAN,
  gprs_status BOOLEAN,
  mqtt_status BOOLEAN,
  
  -- SIM Card Info
  sim_iccid VARCHAR(20),
  sim_imsi VARCHAR(20),
  sim_imei VARCHAR(20),
  sim_operator VARCHAR(50),
  
  -- Device Time
  device_time VARCHAR(20),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_device_id ON sensor_data(device_id);
CREATE INDEX idx_created_at ON sensor_data(created_at DESC);
CREATE INDEX idx_device_created ON sensor_data(device_id, created_at DESC);

-- Create devices table
CREATE TABLE devices (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(100) UNIQUE NOT NULL,
  device_name VARCHAR(255),
  description TEXT,
  location VARCHAR(255),
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6),
  
  -- Configuration
  on_hour INTEGER DEFAULT 18,
  on_min INTEGER DEFAULT 0,
  off_hour INTEGER DEFAULT 6,
  off_min INTEGER DEFAULT 0,
  control_mode VARCHAR(50) DEFAULT 'auto',
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  last_seen TIMESTAMP,
  
  -- Firmware
  firmware_version VARCHAR(50),
  last_ota_check TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_device_status ON devices(status);

-- Create device_alerts table
CREATE TABLE device_alerts (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL,
  alert_type VARCHAR(100),
  alert_message TEXT,
  severity VARCHAR(50),
  resolved BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

CREATE INDEX idx_alert_device ON device_alerts(device_id);
CREATE INDEX idx_alert_severity ON device_alerts(severity);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(100),
  action VARCHAR(100),
  details JSON,
  user_id VARCHAR(100),
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_device ON audit_logs(device_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

## Enable RLS (Row Level Security)

```sql
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to sensor_data
CREATE POLICY "Allow public read sensor_data" ON sensor_data
  FOR SELECT USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert sensor_data" ON sensor_data
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Similar policies for other tables...
```

## Create Realtime Subscriptions

```sql
-- Enable Realtime for sensor_data
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER PUBLICATION supabase_realtime ADD TABLE device_alerts;
```
