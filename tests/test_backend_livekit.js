const fs = require('fs');

async function testAudioPipeline() {
    console.log("\nTesting Pipeline Voice Call (/interact) with voice1.wav...");
    try {
        const audioPath = 'd:\\SpeakMate\\sample_voice\\sample1\\voice1.wav';
        const audioBuffer = fs.readFileSync(audioPath);

        const blob = new Blob([audioBuffer], { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'voice1.wav');
        formData.append('scenarioStr', JSON.stringify({ goals: ['Phỏng vấn tiếng Anh'] }));
        formData.append('conversationHistoryStr', JSON.stringify([]));

        const res = await fetch('http://localhost:3001/api/practice/interact', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        console.log("-----------------------------------------");
        console.log("🗣️ User Transcript:", data.userTranscript);
        console.log("🤖 AI Response:", data.botResponse);
        console.log("🎵 Audio Generated:", data.botAudioUrl ? "Yes (Base64)" : "No");
        console.log("-----------------------------------------");

    } catch (e) {
        console.error("Pipeline Voice Call error:", e.message);
    }
}

testAudioPipeline();
