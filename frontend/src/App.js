import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Power, Zap, Thermometer, MapPin, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import api from './api/axios';
import './App.css';

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [history, setHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [relayLoading, setRelayLoading] = useState(false);

  // Initialize WebSocket
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
    });

    newSocket.on('sensor_data', (data) => {
      if (selectedDevice && data.deviceId === selectedDevice) {
        setLatestData(data.data);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [selectedDevice]);

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, []);

  // Fetch data when device is selected
  useEffect(() => {
    if (selectedDevice) {
      fetchLatestData(selectedDevice);
      fetchHistory(selectedDevice);
      fetchStatistics(selectedDevice);
      
      // Subscribe to device updates
      if (socket) {
        socket.emit('subscribe_device', selectedDevice);
      }

      // Set up auto-refresh
      const interval = setInterval(() => {
        fetchLatestData(selectedDevice);
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [selectedDevice, socket]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/devices');
      setDevices(response.data);
      if (response.data.length > 0 && !selectedDevice) {
        setSelectedDevice(response.data[0].deviceId);
      }
      setError(null);
    } catch (err) {
      setError('Failed to fetch devices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestData = async (deviceId) => {
    try {
      const response = await api.get(`/devices/${deviceId}/latest`);
      setLatestData(response.data);
    } catch (err) {
      console.error('Error fetching latest data:', err);
    }
  };

  const fetchHistory = async (deviceId, hours = 24) => {
    try {
      const response = await api.get(`/devices/${deviceId}/history?hours=${hours}`);
      // Format data for charts
      const formattedData = response.data.map(item => ({
        time: new Date(item.created_at).toLocaleTimeString(),
        voltage: parseFloat(item.voltage),
        current: parseFloat(item.current),
        power: parseFloat(item.power),
        temperature: parseFloat(item.temperature),
        frequency: parseFloat(item.frequency),
        pf: parseFloat(item.power_factor)
      }));
      setHistory(formattedData);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchStatistics = async (deviceId, hours = 24) => {
    try {
      const response = await api.get(`/statistics/${deviceId}?hours=${hours}`);
      setStatistics(response.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const handleRelayControl = async (action) => {
    if (!selectedDevice) return;
    
    try {
      setRelayLoading(true);
      await api.post(`/devices/${selectedDevice}/relay`, { action });
      fetchLatestData(selectedDevice);
      console.log(`✅ Relay turned ${action}`);
    } catch (err) {
      setError(`Failed to control relay: ${err.message}`);
    } finally {
      setRelayLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedDevice) return;
    
    const onHour = prompt('Turn ON hour (0-23):', '18');
    const offHour = prompt('Turn OFF hour (0-23):', '6');
    
    if (onHour !== null && offHour !== null) {
      try {
        await api.post(`/devices/${selectedDevice}/schedule`, {
          on_hour: parseInt(onHour),
          on_min: 0,
          off_hour: parseInt(offHour),
          off_min: 0
        });
        console.log('✅ Schedule updated');
        alert('Schedule updated successfully!');
      } catch (err) {
        setError(`Failed to set schedule: ${err.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Zap className="text-yellow-400" size={32} />
            IoT Streetlight Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Real-time monitoring & control system</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Device Selection */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Select Device</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {devices.map(device => (
              <button
                key={device.deviceId}
                onClick={() => setSelectedDevice(device.deviceId)}
                className={`p-3 rounded-lg font-semibold transition-all ${
                  selectedDevice === device.deviceId
                    ? 'bg-blue-600 text-white border-2 border-blue-400'
                    : 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:bg-gray-600'
                }`}
              >
                <div className="text-sm">{device.deviceId.split('-')[0]}</div>
                <div className="text-xs mt-1">{device.status}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedDevice && latestData && (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Voltage Card */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm">Voltage</p>
                    <p className="text-3xl font-bold mt-2">{latestData.voltage?.toFixed(1)}</p>
                    <p className="text-blue-200 text-xs mt-1">V</p>
                  </div>
                  <Zap size={40} className="text-blue-300" />
                </div>
              </div>

              {/* Current Card */}
              <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm">Current</p>
                    <p className="text-3xl font-bold mt-2">{latestData.current?.toFixed(2)}</p>
                    <p className="text-green-200 text-xs mt-1">A</p>
                  </div>
                  <Zap size={40} className="text-green-300" />
                </div>
              </div>

              {/* Power Card */}
              <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-lg p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-200 text-sm">Power</p>
                    <p className="text-3xl font-bold mt-2">{latestData.power?.toFixed(1)}</p>
                    <p className="text-orange-200 text-xs mt-1">W</p>
                  </div>
                  <Power size={40} className="text-orange-300" />
                </div>
              </div>

              {/* Temperature Card */}
              <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-lg p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-200 text-sm">Temperature</p>
                    <p className="text-3xl font-bold mt-2">{latestData.temperature?.toFixed(1)}</p>
                    <p className="text-red-200 text-xs mt-1">°C</p>
                  </div>
                  <Thermometer size={40} className="text-red-300" />
                </div>
              </div>
            </div>

            {/* Control Panel */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Settings size={24} />
                Control Panel
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => handleRelayControl('on')}
                  disabled={relayLoading}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50"
                >
                  {relayLoading ? 'Processing...' : '🔌 Turn ON'}
                </button>
                <button
                  onClick={() => handleRelayControl('off')}
                  disabled={relayLoading}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50"
                >
                  {relayLoading ? 'Processing...' : '⏻ Turn OFF'}
                </button>
                <button
                  onClick={handleSchedule}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                >
                  📅 Set Schedule
                </button>
                <button
                  onClick={() => {
                    fetchLatestData(selectedDevice);
                    fetchHistory(selectedDevice);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Voltage & Current Chart */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Voltage & Current Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="voltage" stroke="#3b82f6" name="Voltage (V)" strokeWidth={2} />
                    <Line type="monotone" dataKey="current" stroke="#10b981" name="Current (A)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Power Chart */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Power Consumption</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="power" fill="#f59e0b" stroke="#d97706" name="Power (W)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Statistics */}
            {statistics && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">📊 Statistics ({statistics.period})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Voltage</p>
                    <p className="text-white font-semibold mt-2">{statistics.voltage.avg}V</p>
                    <p className="text-gray-500 text-xs mt-1">Min: {statistics.voltage.min}V | Max: {statistics.voltage.max}V</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Current</p>
                    <p className="text-white font-semibold mt-2">{statistics.current.avg}A</p>
                    <p className="text-gray-500 text-xs mt-1">Min: {statistics.current.min}A | Max: {statistics.current.max}A</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Power</p>
                    <p className="text-white font-semibold mt-2">{statistics.power.avg}W</p>
                    <p className="text-gray-500 text-xs mt-1">Min: {statistics.power.min}W | Max: {statistics.power.max}W</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Temperature</p>
                    <p className="text-white font-semibold mt-2">{statistics.temperature.avg}°C</p>
                    <p className="text-gray-500 text-xs mt-1">Min: {statistics.temperature.min}°C | Max: {statistics.temperature.max}°C</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
