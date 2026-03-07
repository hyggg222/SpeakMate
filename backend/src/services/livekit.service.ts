import { AccessToken } from 'livekit-server-sdk';
import { config } from '../config/env';

export class LiveKitService {
    /**
     * Generate a LiveKit token with minimal metadata (session_id only).
     * Worker fetches full context via GET /api/internal/sessions/:id/context.
     */
    public async generateToken(roomName: string, identity: string, sessionId: string): Promise<string> {
        const at = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
            identity: identity,
        });

        at.addGrant({
            roomJoin: true,
            roomCreate: true,
            room: roomName,
        });

        // Minimal metadata — no scenario/history bloat
        at.metadata = JSON.stringify({
            v: 2,
            session_id: sessionId,
        });

        return await at.toJwt();
    }
}
