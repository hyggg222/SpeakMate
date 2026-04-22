// Data Contracts — Single Source of Truth
// Used by: backend, frontend, Python AI (via JSON Schema export)

export interface Character {
    id: string;
    name: string;
    persona: string;
    gender: 'male' | 'female';
    color?: string;
}

export interface DialogueTurn {
    speaker: 'AI' | 'User';
    characterId?: string;
    line: string;
    emotion?: 'neutral' | 'inquisitive' | 'challenging' | 'encouraging';
    expectedUserResponse?: 'technical' | 'behavioral' | 'logical' | 'greeting';
}

export interface InterviewScenario {
    scenarioName: string;
    jobTitle?: string;
    topic?: string;
    interviewerPersona: string;
    characters?: Character[];
    goals: string[];
    startingTurns: DialogueTurn[];
    relevantTags?: string[];
}

export interface EvaluationRubric {
    categories: {
        category: string;
        weight: number;
        description: string;
    }[];
}

export interface StageFeedback {
    score: number;
    feedback: string;
    strengths: string[];
    weaknesses: { turn: number; issue: string; fix: string }[];
    subScores?: Record<string, number>;
}

export interface SessionMetrics {
    coherenceScore: number;
    jargonCount: number;
    jargonList: { word: string; suggestion: string }[];
    fillerCount: number;
    fillerPerMinute: number;
    fillerList: { word: string; count: number }[];
}

export interface EvaluationReport {
    goalProgress: number;
    overallFeedback: string;
    proficiencyLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    language: StageFeedback;
    content: StageFeedback;
    emotion: StageFeedback;
    sessionMetrics?: SessionMetrics;
}

export interface UserProgress {
    userId: string;
    communicationLevel: number;
    totalXP: number;
    currentStreak: number;
    badges: string[];
    totalSessions: number;
    avgCoherence: number;
    avgResponseTime: number;
    storyBankStats: { total: number; battleReady: number; fromPractice: number; uniqueTags: string[] };
    challengeStats: { total: number; completed: number; highestDifficulty: number; completionRate: number };
    emotionTrend: { challengeId: string; before: string; after: string }[];
    updatedAt: string;
}

export interface FullScenarioContext {
    scenario: InterviewScenario;
    evalRules: EvaluationRubric;
}

// ----------------------------------------------------------------
// Story Bank
// ----------------------------------------------------------------

export interface StoryStructured {
    situation: string;
    task: string;
    action: string;
    result: string;
}

export interface StoryEntry {
    id: string;
    userId: string;
    title: string;
    rawInput: string;
    inputMethod: 'text' | 'voice' | 'upload';
    framework: 'STAR' | 'PREP' | 'CAR';
    structured: StoryStructured;
    fullScript: string;
    estimatedDuration: number;
    tags: string[];
    status: 'draft' | 'ready' | 'battle-tested';
    practiceCount: number;
    lastScore: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface StoryStructureResponse {
    needsFollowUp: boolean;
    followUpQuestions?: string[];
    title?: string;
    structured?: StoryStructured;
    fullScript?: string;
    estimatedDuration?: number;
    suggestedTags?: string[];
    framework?: 'STAR' | 'PREP' | 'CAR';
    missingFields?: string[];
    completenessNote?: string | null;
}

export interface StoryPracticeHistory {
    id: string;
    storyId: string;
    sessionId: string | null;
    coverageScore: number;
    missedParts: string[];
    addedParts: string[];
    feedback: string;
    createdAt: string;
}

// ----------------------------------------------------------------
// Bridge to Reality (Challenges)
// ----------------------------------------------------------------

export interface RealWorldChallenge {
    id: string;
    userId: string;
    sessionId: string | null;
    title: string;
    description: string;
    openerHints: string[];
    sourceWeakness: string | null;
    relatedStoryIds: string[];
    suggestedStories: { id: string; title: string }[];
    difficulty: number; // 1-5
    deadline: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    expReward: number;
    createdAt: string;
}

export interface ChallengeFeedbackInput {
    challengeId: string;
    inputMethod: 'voice' | 'form' | 'upload';
    completed: boolean;
    rawTranscript?: string;
    situation?: string;
    emotionBefore?: string;
    emotionAfter?: string;
    whatUserSaid?: string;
    othersReaction?: string;
    whatWorked?: string;
    whatStuck?: string;
}

export interface FeedbackAnalysis {
    comparisonWithGym: string;
    progressNote: string;
    newStoryCandidate: boolean;
    newStorySuggestion?: string;
    nextDifficulty: number; // 1-5
    nextChallengeHint: string;
    xpEarned: number;
    // Ni's personalized analysis
    niComment?: string;
    dialogueAnalysis?: string | null;
    betterPhrasing?: string | null;
}
