// 🚀 REAL-TIME DATA STREAM - Instant Updates for Thousands of Users
// WebSocket-based real-time data streaming with sub-millisecond latency

import { WebSocketServer } from 'ws';
import EventEmitter from 'events';

class RealTimeDataStream extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.connections = new Map();
    this.subscriptions = new Map();
    this.dataCache = new Map();
    this.broadcastQueue = [];
    this.isInitialized = false;
    
    // Performance settings
    this.settings = {
      maxConnections: 10000,
      maxSubscriptionsPerConnection: 100,
      broadcastBatchSize: 1000,
      broadcastInterval: 1, // 1ms
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 60000, // 60 seconds
      enableCompression: true,
      enableBinaryProtocol: true
    };
    
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      peakConnections: 0
    };
  }

  async initialize(server) {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Real-Time Data Stream...');
    
    // Create WebSocket server
    this.wss = new WebSocketServer({
      server,
      perMessageDeflate: this.settings.enableCompression,
      maxPayload: 16 * 1024 * 1024 // 16MB
    });
    
    // Set up WebSocket event handlers
    this.setupWebSocketHandlers();
    
    // Start background processes
    this.startBroadcastProcessor();
    this.startHeartbeatProcessor();
    this.startStatsCollector();
    
    this.isInitialized = true;
    console.log('✅ Real-Time Data Stream initialized');
  }

  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, request) => {
      this.handleNewConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  handleNewConnection(ws, request) {
    const connectionId = this.generateConnectionId();
    const clientIP = request.socket.remoteAddress;
    
    // Create connection object
    const connection = {
      id: connectionId,
      ws,
      ip: clientIP,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      subscriptions: new Set(),
      isAlive: true,
      messageCount: 0,
      bytesReceived: 0,
      bytesSent: 0
    };
    
    // Store connection
    this.connections.set(connectionId, connection);
    
    // Update stats
    this.stats.totalConnections++;
    this.stats.activeConnections++;
    this.stats.peakConnections = Math.max(this.stats.peakConnections, this.stats.activeConnections);
    
    // Set up connection event handlers
    this.setupConnectionHandlers(connection);
    
    // Send welcome message
    this.sendToConnection(connectionId, {
      type: 'welcome',
      connectionId,
      serverTime: Date.now(),
      maxSubscriptions: this.settings.maxSubscriptionsPerConnection
    });
    
    console.log(`📡 New connection: ${connectionId} from ${clientIP}`);
  }

  setupConnectionHandlers(connection) {
    const { ws, id } = connection;
    
    ws.on('message', (data) => {
      this.handleMessage(connection, data);
    });
    
    ws.on('close', (code, reason) => {
      this.handleDisconnection(connection, code, reason);
    });
    
    ws.on('error', (error) => {
      this.handleConnectionError(connection, error);
    });
    
    ws.on('pong', () => {
      connection.isAlive = true;
      connection.lastActivity = Date.now();
    });
  }

  handleMessage(connection, data) {
    const startTime = performance.now();
    connection.lastActivity = Date.now();
    connection.messageCount++;
    connection.bytesReceived += data.length;
    this.stats.messagesReceived++;
    
    try {
      let message;
      
      if (this.settings.enableBinaryProtocol && Buffer.isBuffer(data)) {
        message = this.parseBinaryMessage(data);
      } else {
        message = JSON.parse(data.toString());
      }
      
      // Process message
      this.processMessage(connection, message);
      
      // Update latency stats
      const endTime = performance.now();
      const latency = endTime - startTime;
      this.updateLatencyStats(latency);
      
    } catch (error) {
      this.sendError(connection.id, 'Invalid message format', error.message);
    }
  }

  parseBinaryMessage(data) {
    // Custom binary protocol for ultra-fast parsing
    const type = data.readUInt8(0);
    const length = data.readUInt32BE(1);
    const payload = data.slice(5, 5 + length);
    
    return {
      type,
      data: JSON.parse(payload.toString())
    };
  }

  processMessage(connection, message) {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(connection, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(connection, message);
        break;
      case 'ping':
        this.sendToConnection(connection.id, { type: 'pong', timestamp: Date.now() });
        break;
      case 'get_data':
        this.handleDataRequest(connection, message);
        break;
      default:
        this.sendError(connection.id, 'Unknown message type', message.type);
    }
  }

  handleSubscription(connection, message) {
    const { channel, filters } = message;
    
    if (connection.subscriptions.size >= this.settings.maxSubscriptionsPerConnection) {
      this.sendError(connection.id, 'Too many subscriptions', 'Maximum subscriptions exceeded');
      return;
    }
    
    // Add subscription
    connection.subscriptions.add(channel);
    
    // Add to global subscriptions map
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel).add(connection.id);
    
    // Send confirmation
    this.sendToConnection(connection.id, {
      type: 'subscribed',
      channel,
      filters
    });
    
    // Send current data if available
    const cachedData = this.dataCache.get(channel);
    if (cachedData) {
      this.sendToConnection(connection.id, {
        type: 'data',
        channel,
        data: cachedData,
        timestamp: Date.now()
      });
    }
  }

  handleUnsubscription(connection, message) {
    const { channel } = message;
    
    // Remove subscription
    connection.subscriptions.delete(channel);
    
    // Remove from global subscriptions
    const channelSubscriptions = this.subscriptions.get(channel);
    if (channelSubscriptions) {
      channelSubscriptions.delete(connection.id);
      if (channelSubscriptions.size === 0) {
        this.subscriptions.delete(channel);
      }
    }
    
    // Send confirmation
    this.sendToConnection(connection.id, {
      type: 'unsubscribed',
      channel
    });
  }

  handleDataRequest(connection, message) {
    const { channel, filters } = message;
    
    // Get cached data
    const cachedData = this.dataCache.get(channel);
    if (cachedData) {
      this.sendToConnection(connection.id, {
        type: 'data',
        channel,
        data: this.filterData(cachedData, filters),
        timestamp: Date.now()
      });
    } else {
      this.sendError(connection.id, 'No data available', `Channel ${channel} not found`);
    }
  }

  filterData(data, filters) {
    if (!filters) return data;
    
    // Apply filters to data
    return data.filter(item => {
      for (const [key, value] of Object.entries(filters)) {
        if (item[key] !== value) return false;
      }
      return true;
    });
  }

  // Broadcast data to all subscribers of a channel
  broadcast(channel, data, filters = null) {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers || subscribers.size === 0) return;
    
    // Cache the data
    this.dataCache.set(channel, data);
    
    // Create broadcast message
    const message = {
      type: 'data',
      channel,
      data: filters ? this.filterData(data, filters) : data,
      timestamp: Date.now()
    };
    
    // Queue for batch broadcasting
    this.broadcastQueue.push({
      message,
      subscribers: Array.from(subscribers)
    });
  }

  // Send message to specific connection
  sendToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.ws || connection.ws.readyState !== 1) return;
    
    try {
      let data;
      
      if (this.settings.enableBinaryProtocol) {
        data = this.createBinaryMessage(message);
      } else {
        data = JSON.stringify(message);
      }
      
      connection.ws.send(data);
      connection.bytesSent += data.length;
      this.stats.messagesSent++;
      
    } catch (error) {
      console.error(`Error sending to connection ${connectionId}:`, error);
      this.handleDisconnection(connection, 1006, 'Send error');
    }
  }

  createBinaryMessage(message) {
    const payload = JSON.stringify(message);
    const buffer = Buffer.alloc(5 + payload.length);
    
    buffer.writeUInt8(1, 0); // Message type
    buffer.writeUInt32BE(payload.length, 1);
    buffer.write(payload, 5);
    
    return buffer;
  }

  sendError(connectionId, error, details = null) {
    this.sendToConnection(connectionId, {
      type: 'error',
      error,
      details,
      timestamp: Date.now()
    });
  }

  handleDisconnection(connection, code, reason) {
    console.log(`📡 Connection closed: ${connection.id} (${code}) ${reason}`);
    
    // Remove all subscriptions
    for (const channel of connection.subscriptions) {
      const channelSubscriptions = this.subscriptions.get(channel);
      if (channelSubscriptions) {
        channelSubscriptions.delete(connection.id);
        if (channelSubscriptions.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    }
    
    // Remove connection
    this.connections.delete(connection.id);
    this.stats.activeConnections--;
  }

  handleConnectionError(connection, error) {
    console.error(`Connection error for ${connection.id}:`, error);
    this.handleDisconnection(connection, 1006, 'Connection error');
  }

  startBroadcastProcessor() {
    setInterval(() => {
      if (this.broadcastQueue.length === 0) return;
      
      const batch = this.broadcastQueue.splice(0, this.settings.broadcastBatchSize);
      
      for (const { message, subscribers } of batch) {
        for (const connectionId of subscribers) {
          this.sendToConnection(connectionId, message);
        }
      }
    }, this.settings.broadcastInterval);
  }

  startHeartbeatProcessor() {
    setInterval(() => {
      const now = Date.now();
      
      for (const [connectionId, connection] of this.connections) {
        // Check if connection is alive
        if (now - connection.lastActivity > this.settings.connectionTimeout) {
          this.handleDisconnection(connection, 1006, 'Timeout');
          continue;
        }
        
        // Send ping
        if (connection.ws.readyState === 1) {
          connection.ws.ping();
        }
      }
    }, this.settings.heartbeatInterval);
  }

  startStatsCollector() {
    setInterval(() => {
      this.emit('stats', this.getStats());
    }, 1000);
  }

  updateLatencyStats(latency) {
    this.stats.averageLatency = (this.stats.averageLatency + latency) / 2;
  }

  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      ...this.stats,
      subscriptions: this.subscriptions.size,
      cachedChannels: this.dataCache.size,
      queueSize: this.broadcastQueue.length
    };
  }

  // Public API methods
  getConnectionCount() {
    return this.stats.activeConnections;
  }

  getSubscriptionCount() {
    return this.subscriptions.size;
  }

  getChannelSubscribers(channel) {
    const subscribers = this.subscriptions.get(channel);
    return subscribers ? subscribers.size : 0;
  }

  // Shutdown
  async shutdown() {
    console.log('🔄 Shutting down Real-Time Data Stream...');
    
    // Close all connections
    for (const connection of this.connections.values()) {
      connection.ws.close(1001, 'Server shutdown');
    }
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    console.log('✅ Real-Time Data Stream shutdown complete');
  }
}

// Create singleton instance
const realTimeDataStream = new RealTimeDataStream();

export default realTimeDataStream;


