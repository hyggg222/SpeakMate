// Data Contracts defined for Scenario Builder workflow (The Brain -> The Voice)

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

// Rubric cho The Analyst (Model 3)
export interface EvaluationRubric {
    categories: {
        category: string; // e.g. "STAR Method", "Logical Consistency", "Vocabulary"
        weight: number;
        description: string;
    }[];
}

export interface FullScenarioContext {
    scenario: InterviewScenario;
    evalRules: EvaluationRubric;
}
