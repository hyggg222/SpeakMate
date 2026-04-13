import { AccessToken } from 'livekit-server-sdk';
import { config } from '../config/env';

export class LiveKitService {
    public async generateToken(roomName: string, identity: string, userName: string, scenarioStr: string, conversationHistoryStr: string): Promise<string> {
        const at = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
            identity: identity,
            name: userName,
        });

        at.addGrant({ roomJoin: true, room: roomName });

        let scenario = {};
        let history = [];
        try { scenario = JSON.parse(scenarioStr || '{}'); } catch (e) { }
        try { history = JSON.parse(conversationHistoryStr || '[]'); } catch (e) { }

        const metadata = JSON.stringify({
            scenario,
            history,
            userName
        });

        at.metadata = metadata;

        return await at.toJwt();
    }
}
