import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

async function testToken() {
    console.log("Using API Key:", process.env.GEMINI_API_KEY ? "Set" : "Not Set");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    try {
        const authToken = await ai.authTokens.create({
            config: {
                uses: 1,
                expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                httpOptions: { apiVersion: 'v1alpha' },
                liveConnectConstraints: {
                    model: 'gemini-3.1-flash-live-preview',
                    config: {
                        responseModalities: ['AUDIO' as any],
                        systemInstruction: "test",
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: 'Kore' }
                            }
                        },
                        // Removed languageCodes to test
                    }
                }
            }
        });
        console.log("Success:", authToken);
    } catch (e: any) {
        console.error("FAIL:", e);
        console.error("DETAILS:", e?.message);
        if (e.status) console.error("STATUS:", e.status);
    }
}

testToken();
