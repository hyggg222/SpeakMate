import { BrainAgent } from './src/agents/brain.agent';
import { config } from './src/config/env';

async function testGemini() {
    console.log('Testing Gemini API Connection...');
    console.log('API Key Present:', !!config.geminiApiKey);

    const agent = new BrainAgent();
    try {
        const result = await agent.generateScenario('Tôi muốn luyện phỏng vấn Software Engineer 3 năm kinh nghiệm với công ty Google.');
        console.log('--- Result ---');
        console.log(JSON.stringify(result, null, 2));
        console.log('--- Success ---');
    } catch (e: any) {
        console.error('Test failed:', e?.message || e);
    }
}

testGemini();
