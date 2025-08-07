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

// Serve index.html for root path
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Import and start the bot
import('./src/index.js')
    .then(() => console.log('Bot started successfully'))
    .catch(err => console.error('Failed to start bot:', err));

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
