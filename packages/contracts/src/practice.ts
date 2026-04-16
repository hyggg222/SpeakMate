// Data Contracts — Single Source of Truth
// Used by: backend, frontend, Python AI (via JSON Schema export)

export interface DialogueTurn {
    speaker: 'AI' | 'User';
    line: string;
    emotion?: 'neutral' | 'inquisitive' | 'challenging' | 'encouraging';
    expectedUserResponse?: 'technical' | 'behavioral' | 'logical' | 'greeting';
}

export interface InterviewScenario {
    scenarioName: string;
    jobTitle?: string;
    topic?: string;
    interviewerPersona: string;
    goals: string[];
    startingTurns: DialogueTurn[];
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
}

export interface EvaluationReport {
    goalProgress: number;
    overallFeedback: string;
    language: StageFeedback;
    content: StageFeedback;
    emotion: StageFeedback;
}

export interface FullScenarioContext {
    scenario: InterviewScenario;
    evalRules: EvaluationRubric;
}
