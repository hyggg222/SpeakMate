import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import multer from 'multer';
import practiceRoutes from './routes/practice.routes';
import dns from 'dns';
import { Agent, setGlobalDispatcher } from 'undici';

// CRITICAL: Force IPv4 first for DNS and Connection to prevent ENOTFOUND/Timeout on Windows
dns.setDefaultResultOrder('ipv4first');
setGlobalDispatcher(new Agent({
    connect: {
        family: 4,
        lookup: dns.lookup // Use the standard lookup which follows the default result order
    }
}));

// Init express
const app = express();
const port = config.port;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SpeakMate Backend is running' });
});

// Setup Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Routes
app.use('/api/practice', practiceRoutes);

// Start Server
app.listen(port, () => {
    console.log(`[server]: SpeakMate Backend is running at http://localhost:${port}`);
});
