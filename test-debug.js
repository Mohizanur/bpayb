// Test debug module compatibility
import debugModule from 'debug';
import http from 'http';

const debug = debugModule('test');

// Test debug functionality
debug('Testing debug module...');

// Simple HTTP server to test the module in a web context
const server = http.createServer((req, res) => {
  debug('Request received: %s %s', req.method, req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Debug test successful!\n');
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('If you see this, the debug module is working!');
});

// Test debug with namespaces
const debugHttp = debug.extend('http');
debugHttp('HTTP debug test');

// Test error handling
try {
  // Try to use debug in a way that would fail if there were issues
  debug.enabled = true;
  debug('Debug is enabled');
} catch (err) {
  console.error('Debug test failed:', err);
  process.exit(1);
}
