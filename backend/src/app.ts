// Override global fetch với node-fetch + https.Agent force IPv4
// (Node.js built-in undici bỏ qua dns.setDefaultResultOrder, cách này work ở mọi env)
import https from 'https';
import fetch, { Headers, Request, Response } from 'node-fetch';

const ipv4Agent = new https.Agent({ family: 4 });
const fetchWithIPv4: typeof globalThis.fetch = (input: any, init?: any) =>
    fetch(input, { ...init, agent: ipv4Agent }) as any;

// @ts-ignore — override built-in fetch để force IPv4 cho @google/genai SDK
globalThis.fetch = fetchWithIPv4;
// @ts-ignore
globalThis.Headers = Headers;
// @ts-ignore
globalThis.Request = Request;
// @ts-ignore
globalThis.Response = Response;

import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import multer from 'multer';

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

// Setup Multer for memory storage (Temporary before streaming / FFmpeg)
const upload = multer({ storage: multer.memoryStorage() });

// Routes
import practiceRoutes from './routes/practice.routes';
app.use('/api/practice', practiceRoutes);

// Start Server
app.listen(port, () => {
    console.log(`[server]: SpeakMate Backend is running at http://localhost:${port}`);
});
