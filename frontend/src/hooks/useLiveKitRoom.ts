import { useState, useCallback, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteParticipant, Participant, DataPacket_Kind } from 'livekit-client';

export interface TurnData {
    speaker: 'AI' | 'User';
    line: string;
    turn_index?: number;
    confirmed?: boolean;
}

export function useLiveKitRoom(
    onNewTurn: (turn: TurnData) => void,
    onTurnConfirmed?: (turnIndex: number) => void
) {
    const [room, setRoom] = useState<Room | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isAgentReady, setIsAgentReady] = useState(false);
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [isMicEnabled, setIsMicEnabled] = useState(false);
    const userSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onNewTurnRef = useRef(onNewTurn);
    const onTurnConfirmedRef = useRef(onTurnConfirmed);

    useEffect(() => {
        onNewTurnRef.current = onNewTurn;
        onTurnConfirmedRef.current = onTurnConfirmed;
    }, [onNewTurn, onTurnConfirmed]);

    // This part should be passed from the page to update the optimistic state
    // We'll expose it as a return value if needed, but for now we follow the pattern
    // where the page provides the callback.

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
                    onNewTurnRef.current({
                        speaker: msg.speaker,
                        line: msg.line,
                        turn_index: msg.turn_index,
                        confirmed: msg.confirmed ?? false
                    });
                }
                if (msg.type === 'agent_ready') {
                    setIsAgentReady(true);
                }
                if (msg.type === 'ai_interrupted') {
                    setIsAgentSpeaking(false);
                }
                if (msg.type === 'turn_confirmed') {
                    onTurnConfirmedRef.current?.(msg.turn_index);
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

            if (isUserActive) {
                // User is speaking, clear any pending timeout and set local state immediately
                if (userSpeakingTimeoutRef.current) {
                    clearTimeout(userSpeakingTimeoutRef.current);
                    userSpeakingTimeoutRef.current = null;
                }
                setIsUserSpeaking(true);
            } else {
                // User stopped speaking, wait before updating UI state
                if (!userSpeakingTimeoutRef.current) {
                    userSpeakingTimeoutRef.current = setTimeout(() => {
                        setIsUserSpeaking(false);
                        userSpeakingTimeoutRef.current = null;
                    }, 1500); // 1.5s delay to match backend pause tolerance
                }
            }
        });

        await newRoom.connect(url, token);

        setRoom(newRoom);
        setIsConnected(true);
        setIsMicEnabled(false);
    }, [isUserSpeaking]);

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
        isAgentReady,
        isAgentSpeaking,
        isUserSpeaking,
        isMicEnabled,
        connect,
        disconnect,
        toggleMic,
    };
}
