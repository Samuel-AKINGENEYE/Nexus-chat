// Performance monitoring for Nexus
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiLatency: [],
      dbQueryTime: [],
      memoryUsage: [],
      activeConnections: 0
    };
  }
  
  recordApiLatency(endpoint, duration) {
    this.metrics.apiLatency.push({ endpoint, duration, timestamp: Date.now() });
    // Keep last 1000 records
    if (this.metrics.apiLatency.length > 1000) {
      this.metrics.apiLatency.shift();
    }
  }
  
  getAverageLatency() {
    if (this.metrics.apiLatency.length === 0) return 0;
    const sum = this.metrics.apiLatency.reduce((acc, m) => acc + m.duration, 0);
    return sum / this.metrics.apiLatency.length;
  }
  
  getMetrics() {
    return {
      averageLatency: this.getAverageLatency(),
      totalRequests: this.metrics.apiLatency.length,
      activeConnections: this.metrics.activeConnections,
      memoryUsage: process.memoryUsage()
    };
  }
}

module.exports = new PerformanceMonitor();
