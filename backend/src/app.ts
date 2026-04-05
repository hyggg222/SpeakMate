import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import multer from 'multer';
import practiceRoutes from './routes/practice.routes';
import internalRoutes from './routes/internal.routes';
import storybankRoutes from './routes/storybank.routes';
import mentorChatRoutes from './routes/mentor-chat.routes';
import dns from 'dns';
import { Agent, setGlobalDispatcher, fetch as undiciFetch } from 'undici';

// CRITICAL: Force IPv4 first for DNS and Connection to prevent ENOTFOUND/Timeout on Windows
dns.setDefaultResultOrder('ipv4first');
const ipv4Agent = new Agent({
    connect: {
        family: 4,
        timeout: 30_000, // 30s connect timeout (Windows DNS can be slow on first call)
        lookup: (hostname, options: any, callback) => {
            // Force IPv4 for Gemini API domains to avoid Windows DNS race conditions
            if (hostname.includes('googleapis.com')) {
                dns.resolve4(hostname, (err, addresses) => {
                    if (err || !addresses || addresses.length === 0) {
                        return dns.lookup(hostname, { family: 4 }, callback);
                    }
                    callback(null, addresses[0], 4);
                });
            } else {
                dns.lookup(hostname, options, callback);
            }
        }
    },
    bodyTimeout: 60_000,
    headersTimeout: 60_000,
});
setGlobalDispatcher(ipv4Agent);
// Override globalThis.fetch so @google/genai SDK also uses IPv4
(globalThis as any).fetch = (url: any, opts: any) => undiciFetch(url, { ...opts, dispatcher: ipv4Agent });

// Warm up DNS + connection pool on startup (non-blocking)
dns.resolve4('generativelanguage.googleapis.com', () => { });
dns.resolve4('vlxpxatpuwkjnwhwfprz.supabase.co', () => { });

// Init express
const app = express();
const port = config.port;

// Middleware — allow all origins; use ALLOWED_ORIGINS only to add extra restrictions if needed
const extraOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(o => o !== '*')
    : [];
app.use(cors({
    origin: (origin, callback) => {
        // Always allow: no-origin requests (curl/Postman), and all browser origins
        callback(null, true);
    }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SpeakMate Backend is running' });
});

// Setup Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Health check (used by Railway)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Language middleware — reads X-Language header and attaches to req.language
app.use((req, _res, next) => {
    req.language = (req.headers['x-language'] as string) || 'vi';
    next();
});

// Routes
app.use('/api/practice', practiceRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/storybank', storybankRoutes);
app.use('/api/mentor-chat', mentorChatRoutes);

// Start Server
app.listen(port, () => {
    console.log(`[server]: SpeakMate Backend is running at http://localhost:${port}`);
});
