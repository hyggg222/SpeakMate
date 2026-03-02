import { config } from './src/config/env';

async function listModelsFetch() {
    console.log('Fetching models from REST API directly...');
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`);
        const data = await res.json();
        if (data && data.models) {
            console.log('Available Models:');
            data.models.forEach((m: any) => console.log(m.name));
        } else {
            console.log('Failed:', data);
        }
    } catch (err: any) {
        console.error('Network Error:', err.message);
    }
}

listModelsFetch();
