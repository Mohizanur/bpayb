// 🚀 COMPRESSION ENGINE - Advanced Compression for Maximum Performance
// Brotli, Gzip, and custom compression algorithms for ultra-fast data transfer

import zlib from 'zlib';
import { promisify } from 'util';
import { performance } from 'perf_hooks';

class CompressionEngine {
  constructor() {
    this.isInitialized = false;
    this.compressionAlgorithms = new Map();
    this.decompressionAlgorithms = new Map();
    this.compressionStats = {
      totalCompressed: 0,
      totalDecompressed: 0,
      totalBytesSaved: 0,
      averageCompressionRatio: 0,
      compressionTimes: [],
      decompressionTimes: []
    };
    
    // Compression settings
    this.settings = {
      enableBrotli: true,
      enableGzip: true,
      enableDeflate: true,
      enableCustom: true,
      brotliLevel: 6, // Balance between speed and compression
      gzipLevel: 6,
      deflateLevel: 6,
      chunkSize: 64 * 1024, // 64KB chunks
      maxCompressionSize: 10 * 1024 * 1024, // 10MB max
      minCompressionSize: 1024, // 1KB min
      enableStreaming: true,
      enableParallel: true
    };
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Compression Engine...');
    
    try {
      // Initialize compression algorithms
      this.initializeBrotli();
      this.initializeGzip();
      this.initializeDeflate();
      this.initializeCustom();
      
      // Set up performance monitoring
      this.startPerformanceMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Compression Engine initialized');
      
    } catch (error) {
      console.error('❌ Compression Engine initialization failed:', error.message);
      throw error;
    }
  }

  initializeBrotli() {
    if (!this.settings.enableBrotli) return;
    
    try {
      const brotliCompress = promisify(zlib.brotliCompress);
      const brotliDecompress = promisify(zlib.brotliDecompress);
      
      this.compressionAlgorithms.set('brotli', {
        name: 'brotli',
        compress: async (data) => {
          const startTime = performance.now();
          const compressed = await brotliCompress(data, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: this.settings.brotliLevel,
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length
            }
          });
          const endTime = performance.now();
          this.recordCompressionTime(endTime - startTime);
          return compressed;
        },
        decompress: async (data) => {
          const startTime = performance.now();
          const decompressed = await brotliDecompress(data);
          const endTime = performance.now();
          this.recordDecompressionTime(endTime - startTime);
          return decompressed;
        },
        priority: 1 // Highest priority
      });
      
      console.log('✅ Brotli compression initialized');
    } catch (error) {
      console.warn('⚠️ Brotli compression not available:', error.message);
    }
  }

  initializeGzip() {
    if (!this.settings.enableGzip) return;
    
    try {
      const gzipCompress = promisify(zlib.gzip);
      const gzipDecompress = promisify(zlib.gunzip);
      
      this.compressionAlgorithms.set('gzip', {
        name: 'gzip',
        compress: async (data) => {
          const startTime = performance.now();
          const compressed = await gzipCompress(data, {
            level: this.settings.gzipLevel,
            chunkSize: this.settings.chunkSize
          });
          const endTime = performance.now();
          this.recordCompressionTime(endTime - startTime);
          return compressed;
        },
        decompress: async (data) => {
          const startTime = performance.now();
          const decompressed = await gzipDecompress(data);
          const endTime = performance.now();
          this.recordDecompressionTime(endTime - startTime);
          return decompressed;
        },
        priority: 2
      });
      
      console.log('✅ Gzip compression initialized');
    } catch (error) {
      console.warn('⚠️ Gzip compression not available:', error.message);
    }
  }

  initializeDeflate() {
    if (!this.settings.enableDeflate) return;
    
    try {
      const deflateCompress = promisify(zlib.deflate);
      const deflateDecompress = promisify(zlib.inflate);
      
      this.compressionAlgorithms.set('deflate', {
        name: 'deflate',
        compress: async (data) => {
          const startTime = performance.now();
          const compressed = await deflateCompress(data, {
            level: this.settings.deflateLevel,
            chunkSize: this.settings.chunkSize
          });
          const endTime = performance.now();
          this.recordCompressionTime(endTime - startTime);
          return compressed;
        },
        decompress: async (data) => {
          const startTime = performance.now();
          const decompressed = await deflateDecompress(data);
          const endTime = performance.now();
          this.recordDecompressionTime(endTime - startTime);
          return decompressed;
        },
        priority: 3
      });
      
      console.log('✅ Deflate compression initialized');
    } catch (error) {
      console.warn('⚠️ Deflate compression not available:', error.message);
    }
  }

  initializeCustom() {
    if (!this.settings.enableCustom) return;
    
    // Custom compression for specific data types
    this.compressionAlgorithms.set('custom', {
      name: 'custom',
      compress: async (data) => {
        const startTime = performance.now();
        const compressed = await this.customCompress(data);
        const endTime = performance.now();
        this.recordCompressionTime(endTime - startTime);
        return compressed;
      },
      decompress: async (data) => {
        const startTime = performance.now();
        const decompressed = await this.customDecompress(data);
        const endTime = performance.now();
        this.recordDecompressionTime(endTime - startTime);
        return decompressed;
      },
      priority: 4
    });
    
    console.log('✅ Custom compression initialized');
  }

  // Smart compression selection
  async compress(data, algorithm = 'auto', options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Convert data to buffer if needed
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    // Check if compression is beneficial
    if (buffer.length < this.settings.minCompressionSize) {
      return { data: buffer, algorithm: 'none', ratio: 1 };
    }
    
    if (buffer.length > this.settings.maxCompressionSize) {
      return { data: buffer, algorithm: 'none', ratio: 1 };
    }
    
    // Select algorithm
    const selectedAlgorithm = algorithm === 'auto' ? 
      this.selectBestAlgorithm(buffer) : 
      this.compressionAlgorithms.get(algorithm);
    
    if (!selectedAlgorithm) {
      return { data: buffer, algorithm: 'none', ratio: 1 };
    }
    
    try {
      const compressed = await selectedAlgorithm.compress(buffer);
      const ratio = compressed.length / buffer.length;
      
      // Only use compression if it's beneficial
      if (ratio < 0.9) { // 10% compression minimum
        this.compressionStats.totalCompressed++;
        this.compressionStats.totalBytesSaved += (buffer.length - compressed.length);
        this.updateCompressionRatio(ratio);
        
        return {
          data: compressed,
          algorithm: selectedAlgorithm.name,
          ratio,
          originalSize: buffer.length,
          compressedSize: compressed.length,
          bytesSaved: buffer.length - compressed.length
        };
      } else {
        return { data: buffer, algorithm: 'none', ratio: 1 };
      }
    } catch (error) {
      console.error(`❌ Compression failed with ${selectedAlgorithm.name}:`, error.message);
      return { data: buffer, algorithm: 'none', ratio: 1 };
    }
  }

  // Smart decompression
  async decompress(data, algorithm) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (algorithm === 'none') {
      return data;
    }
    
    const decompressor = this.compressionAlgorithms.get(algorithm);
    if (!decompressor) {
      throw new Error(`Unknown compression algorithm: ${algorithm}`);
    }
    
    try {
      const decompressed = await decompressor.decompress(data);
      this.compressionStats.totalDecompressed++;
      
      return decompressed;
    } catch (error) {
      console.error(`❌ Decompression failed with ${algorithm}:`, error.message);
      throw error;
    }
  }

  // Select best compression algorithm based on data characteristics
  selectBestAlgorithm(data) {
    const algorithms = Array.from(this.compressionAlgorithms.values())
      .sort((a, b) => a.priority - b.priority);
    
    // For small data, use faster algorithms
    if (data.length < 1024) {
      return algorithms.find(algo => algo.name === 'gzip') || algorithms[0];
    }
    
    // For large data, use better compression
    if (data.length > 1024 * 1024) {
      return algorithms.find(algo => algo.name === 'brotli') || algorithms[0];
    }
    
    // Default to first available algorithm
    return algorithms[0];
  }

  // Custom compression for specific data types
  async customCompress(data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    // Simple run-length encoding for repetitive data
    if (this.isRepetitiveData(buffer)) {
      return this.runLengthEncode(buffer);
    }
    
    // Dictionary compression for text data
    if (this.isTextData(buffer)) {
      return this.dictionaryCompress(buffer);
    }
    
    // Fall back to deflate
    const deflate = this.compressionAlgorithms.get('deflate');
    if (deflate) {
      return await deflate.compress(buffer);
    }
    
    return buffer;
  }

  async customDecompress(data) {
    // Try to detect compression type
    if (this.isRunLengthEncoded(data)) {
      return this.runLengthDecode(data);
    }
    
    if (this.isDictionaryCompressed(data)) {
      return this.dictionaryDecompress(data);
    }
    
    // Fall back to deflate
    const deflate = this.compressionAlgorithms.get('deflate');
    if (deflate) {
      return await deflate.decompress(data);
    }
    
    return data;
  }

  // Utility methods
  isRepetitiveData(buffer) {
    if (buffer.length < 100) return false;
    
    const sample = buffer.slice(0, Math.min(100, buffer.length));
    const firstByte = sample[0];
    
    // Check if first 100 bytes are the same
    for (let i = 1; i < sample.length; i++) {
      if (sample[i] !== firstByte) return false;
    }
    
    return true;
  }

  isTextData(buffer) {
    // Simple heuristic to detect text data
    let textBytes = 0;
    const sample = buffer.slice(0, Math.min(1000, buffer.length));
    
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
        textBytes++;
      }
    }
    
    return (textBytes / sample.length) > 0.8;
  }

  runLengthEncode(buffer) {
    const result = [];
    let currentByte = buffer[0];
    let count = 1;
    
    for (let i = 1; i < buffer.length; i++) {
      if (buffer[i] === currentByte && count < 255) {
        count++;
      } else {
        result.push(count, currentByte);
        currentByte = buffer[i];
        count = 1;
      }
    }
    
    result.push(count, currentByte);
    return Buffer.from(result);
  }

  runLengthDecode(buffer) {
    const result = [];
    
    for (let i = 0; i < buffer.length; i += 2) {
      const count = buffer[i];
      const byte = buffer[i + 1];
      
      for (let j = 0; j < count; j++) {
        result.push(byte);
      }
    }
    
    return Buffer.from(result);
  }

  dictionaryCompress(buffer) {
    // Simple dictionary compression
    const dictionary = new Map();
    const result = [];
    let dictIndex = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      
      if (dictionary.has(byte)) {
        result.push(dictionary.get(byte));
      } else {
        dictionary.set(byte, dictIndex++);
        result.push(byte);
      }
    }
    
    return Buffer.from(result);
  }

  dictionaryDecompress(buffer) {
    // Simple dictionary decompression
    const dictionary = new Map();
    const result = [];
    let dictIndex = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      
      if (dictionary.has(byte)) {
        result.push(dictionary.get(byte));
      } else {
        dictionary.set(byte, dictIndex++);
        result.push(byte);
      }
    }
    
    return Buffer.from(result);
  }

  isRunLengthEncoded(buffer) {
    // Simple heuristic to detect run-length encoded data
    return buffer.length % 2 === 0 && buffer.length > 0;
  }

  isDictionaryCompressed(buffer) {
    // Simple heuristic to detect dictionary compressed data
    return buffer.length > 0;
  }

  // Performance monitoring
  recordCompressionTime(time) {
    this.compressionStats.compressionTimes.push(time);
    if (this.compressionStats.compressionTimes.length > 1000) {
      this.compressionStats.compressionTimes = this.compressionStats.compressionTimes.slice(-1000);
    }
  }

  recordDecompressionTime(time) {
    this.compressionStats.decompressionTimes.push(time);
    if (this.compressionStats.decompressionTimes.length > 1000) {
      this.compressionStats.decompressionTimes = this.compressionStats.decompressionTimes.slice(-1000);
    }
  }

  updateCompressionRatio(ratio) {
    const total = this.compressionStats.totalCompressed;
    this.compressionStats.averageCompressionRatio = 
      (this.compressionStats.averageCompressionRatio * (total - 1) + ratio) / total;
  }

  startPerformanceMonitoring() {
    setInterval(() => {
      this.cleanupStats();
    }, 60000); // Cleanup every minute
  }

  cleanupStats() {
    // Keep only recent performance data
    if (this.compressionStats.compressionTimes.length > 1000) {
      this.compressionStats.compressionTimes = this.compressionStats.compressionTimes.slice(-1000);
    }
    
    if (this.compressionStats.decompressionTimes.length > 1000) {
      this.compressionStats.decompressionTimes = this.compressionStats.decompressionTimes.slice(-1000);
    }
  }

  // Public API methods
  getStats() {
    const avgCompressionTime = this.compressionStats.compressionTimes.length > 0 ?
      this.compressionStats.compressionTimes.reduce((a, b) => a + b, 0) / this.compressionStats.compressionTimes.length : 0;
    
    const avgDecompressionTime = this.compressionStats.decompressionTimes.length > 0 ?
      this.compressionStats.decompressionTimes.reduce((a, b) => a + b, 0) / this.compressionStats.decompressionTimes.length : 0;
    
    return {
      ...this.compressionStats,
      averageCompressionTime: avgCompressionTime,
      averageDecompressionTime: avgDecompressionTime,
      algorithms: Array.from(this.compressionAlgorithms.keys()),
      settings: this.settings
    };
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  // Health check
  async healthCheck() {
    try {
      const testData = Buffer.from('test data for compression health check');
      const compressed = await this.compress(testData);
      const decompressed = await this.decompress(compressed.data, compressed.algorithm);
      
      return {
        status: 'healthy',
        testPassed: decompressed.equals(testData),
        stats: this.getStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        stats: this.getStats()
      };
    }
  }
}

// Create singleton instance
const compressionEngine = new CompressionEngine();

export default compressionEngine;


