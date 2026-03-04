import { useState, useCallback, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteParticipant, Participant, DataPacket_Kind } from 'livekit-client';

export interface TurnData {
    speaker: 'AI' | 'User';
    line: string;
}

export function useLiveKitRoom(onNewTurn: (turn: TurnData) => void) {
    const [room, setRoom] = useState<Room | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [isMicEnabled, setIsMicEnabled] = useState(false);

    const onNewTurnRef = useRef(onNewTurn);
    useEffect(() => {
        onNewTurnRef.current = onNewTurn;
    }, [onNewTurn]);

    const connect = useCallback(async (token: string, url: string) => {
        const newRoom = new Room({
            audioCaptureDefaults: {
                autoGainControl: true,
                echoCancellation: true,
                noiseSuppression: true,
            },
        });

        newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant, kind?: DataPacket_Kind) => {
            try {
                const decoder = new TextDecoder();
                const text = decoder.decode(payload);
                const msg = JSON.parse(text);
                if (msg.type === 'transcript') {
                    onNewTurnRef.current({ speaker: msg.speaker, line: msg.line });
                }
            } catch (e) {
                console.error("Failed to parse data message", e);
            }
        });

        newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
            if (track.kind === Track.Kind.Audio) {
                const element = track.attach();
                // We don't necessarily need to appendChild, attach() already creates <audio autoplay> depending on version
                // But appending ensures playback context
                document.body.appendChild(element);
            }
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
            track.detach();
        });

        newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
            const isAgentActive = speakers.some(p => !p.isLocal);
            const isUserActive = speakers.some(p => p.isLocal);
            setIsAgentSpeaking(isAgentActive);
            setIsUserSpeaking(isUserActive);
        });

        await newRoom.connect(url, token);

        setRoom(newRoom);
        setIsConnected(true);
        setIsMicEnabled(false);
    }, []);

    const disconnect = useCallback(() => {
        if (room) {
            room.disconnect();
            setRoom(null);
            setIsConnected(false);
        }
    }, [room]);

    const toggleMic = useCallback(async () => {
        if (room) {
            const willEnable = !isMicEnabled;
            await room.localParticipant.setMicrophoneEnabled(willEnable);
            setIsMicEnabled(willEnable);
        }
    }, [room, isMicEnabled]);

    useEffect(() => {
        return () => {
            if (room) {
                room.disconnect();
            }
        };
    }, [room]);

    return {
        isConnected,
        isAgentSpeaking,
        isUserSpeaking,
        isMicEnabled,
        connect,
        disconnect,
        toggleMic,
    };
}
