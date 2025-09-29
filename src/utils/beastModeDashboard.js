import { beastModeOptimizer } from './beastModeOptimizer.js';

class BeastModeDashboard {
  constructor() {
    this.updateInterval = null;
    this.stats = {};
    this.startMonitoring();
  }

  startMonitoring() {
    // Update stats every 5 seconds
    this.updateInterval = setInterval(() => {
      this.updateStats();
    }, 5000);
  }

  stopMonitoring() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  updateStats() {
    this.stats = beastModeOptimizer.getPerformanceStats();
    this.displayStats();
  }

  displayStats() {
    console.clear();
    console.log('🔥 BEAST MODE PERFORMANCE DASHBOARD 🔥');
    console.log('='.repeat(60));
    
    // Overall Performance
    console.log('\n📊 OVERALL PERFORMANCE:');
    console.log(`   Total Requests: ${this.stats.totalRequests.toLocaleString()}`);
    console.log(`   Requests/Second: ${this.stats.requestsPerSecond}`);
    console.log(`   Avg Response Time: ${this.stats.avgResponseTime.toFixed(2)}ms`);
    console.log(`   Uptime: ${this.stats.uptime}s`);
    
    // Connection Stats
    console.log('\n🔗 CONNECTION STATS:');
    console.log(`   Active Connections: ${this.stats.connectionStats.activeConnections.toLocaleString()}`);
    console.log(`   Max Connections: ${this.stats.connectionStats.maxConnections.toLocaleString()}`);
    console.log(`   Utilization: ${this.stats.connectionStats.utilization}%`);
    console.log(`   Queued Connections: ${this.stats.connectionStats.queuedConnections}`);
    console.log(`   Peak Concurrent Users: ${this.stats.peakConcurrentUsers.toLocaleString()}`);
    
    // Cache Performance
    console.log('\n💾 CACHE PERFORMANCE:');
    console.log(`   Cache Hit Rate: ${this.stats.cacheStats.hitRate}%`);
    console.log(`   Cache Size: ${this.stats.cacheStats.size.toLocaleString()}`);
    console.log(`   Cache Hits: ${this.stats.cacheStats.hits.toLocaleString()}`);
    console.log(`   Cache Misses: ${this.stats.cacheStats.misses.toLocaleString()}`);
    
    // Firestore Optimization
    console.log('\n💰 FIRESTORE OPTIMIZATION:');
    console.log(`   Firestore Calls: ${this.stats.firestoreCalls.toLocaleString()}`);
    console.log(`   Cost Reduction: ${this.calculateCostReduction()}%`);
    
    // BEAST MODE Efficiency
    console.log('\n🚀 BEAST MODE EFFICIENCY:');
    console.log(`   Overall Efficiency: ${this.stats.beastMode.efficiency.overall}%`);
    console.log(`   Response Time Efficiency: ${this.stats.beastMode.efficiency.responseTime}%`);
    console.log(`   Cache Efficiency: ${this.stats.beastMode.efficiency.cache}%`);
    console.log(`   Connection Efficiency: ${this.stats.beastMode.efficiency.connections}%`);
    
    // Performance Alerts
    this.displayAlerts();
    
    console.log('\n' + '='.repeat(60));
    console.log('🔄 Auto-refresh every 5 seconds | Press Ctrl+C to exit');
  }

  calculateCostReduction() {
    const totalRequests = this.stats.totalRequests;
    const firestoreCalls = this.stats.firestoreCalls;
    
    if (totalRequests === 0) return 0;
    
    const reduction = ((totalRequests - firestoreCalls) / totalRequests) * 100;
    return Math.round(reduction);
  }

  displayAlerts() {
    const alerts = [];
    
    // Response time alerts
    if (this.stats.avgResponseTime > 50) {
      alerts.push('⚠️  High response time detected');
    }
    
    // Cache hit rate alerts
    if (parseFloat(this.stats.cacheStats.hitRate) < 80) {
      alerts.push('⚠️  Low cache hit rate');
    }
    
    // Connection utilization alerts
    if (parseFloat(this.stats.connectionStats.utilization) > 90) {
      alerts.push('⚠️  High connection utilization');
    }
    
    // Memory alerts
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 800 * 1024 * 1024) { // 800MB
      alerts.push('⚠️  High memory usage');
    }
    
    if (alerts.length > 0) {
      console.log('\n🚨 PERFORMANCE ALERTS:');
      alerts.forEach(alert => console.log(`   ${alert}`));
    } else {
      console.log('\n✅ All systems operating at peak efficiency');
    }
  }

  getDetailedStats() {
    return {
      ...this.stats,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      costSavings: this.calculateCostReduction()
    };
  }

  // Export stats for external monitoring
  exportStats() {
    return {
      timestamp: Date.now(),
      performance: this.stats,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      costSavings: this.calculateCostReduction()
    };
  }
}

// Create global dashboard instance
const beastModeDashboard = new BeastModeDashboard();

// Auto-start dashboard in development
if (process.env.NODE_ENV === 'development') {
  console.log('📊 BEAST MODE Dashboard started in development mode');
}

export { beastModeDashboard, BeastModeDashboard };






