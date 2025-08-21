// Simple Express server for Render deployment
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin panel static files
app.use('/panel', express.static(path.join(__dirname, 'panel')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        node: process.version,
        env: process.env.NODE_ENV || 'development'
    });
});

// Simple root route
app.get('/', (req, res) => {
    res.json({
        name: 'BirrPay Bot',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Admin panel route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel', 'admin-new.html'));
});

// Admin panel route (alternative)
app.get('/panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel', 'admin-new.html'));
});

// Serve index.html for root path
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Import and start the bot
const startBot = async () => {
  try {
    // Import the main bot file
    const { startBot } = await import('./src/index.js');
    await startBot();
    console.log('Bot started successfully');
  } catch (err) {
    console.error('Failed to start bot:', err);
    // Try to restart after a delay
    setTimeout(startBot, 5000);
  }
};

// Start the bot
startBot();

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`Admin Panel (alt): http://localhost:${PORT}/panel`);
});
