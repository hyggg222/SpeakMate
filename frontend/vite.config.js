import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    build: {
        outDir: '../backend/static', // Build directly to backend's static folder for production (optional) or just 'dist'
        emptyOutDir: true,
    }
});
