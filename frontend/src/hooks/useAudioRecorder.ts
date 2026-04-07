import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<BlobPart[]>([]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Thử dùng định dạng hỗ trợ tốt nhất trên Chrome/Safari
            const mimeType = MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/mp4';

            mediaRecorder.current = new MediaRecorder(stream, { mimeType });

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Lỗi truy cập Microphone:', err);
            // Có thể throw toast ở đây
        }
    }, []);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!mediaRecorder.current) {
                resolve(null);
                return;
            }

            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, {
                    type: mediaRecorder.current?.mimeType || 'audio/webm',
                });
                audioChunks.current = []; // reset for next
                resolve(audioBlob);
            };

            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
            setIsRecording(false);
        });
    }, []);

    return {
        isRecording,
        startRecording,
        stopRecording,
    };
};
