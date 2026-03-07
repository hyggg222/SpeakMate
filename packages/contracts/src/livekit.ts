// LiveKit Participant Metadata — contract between backend token generation and Modal worker

export interface ParticipantMetadata {
    /** Schema version — worker uses this for backward compatibility */
    v: number;
    /** Session ID — worker fetches full context via Internal API */
    session_id: string;
}
