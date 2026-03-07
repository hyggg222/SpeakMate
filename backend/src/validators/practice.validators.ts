import { z } from 'zod';

/**
 * Helper: validates that a string is parseable as JSON.
 */
const jsonString = (fieldName: string) =>
    z.string({ required_error: `${fieldName} is required` }).refine(
        (val) => {
            try {
                JSON.parse(val);
                return true;
            } catch {
                return false;
            }
        },
        { message: `${fieldName} must be valid JSON` }
    );

/**
 * Helper: validates a non-empty object (at least one key).
 */
const nonEmptyObject = (fieldName: string) =>
    z
        .object({}, { required_error: `${fieldName} is required` })
        .passthrough()
        .refine((val) => Object.keys(val).length > 0, {
            message: `${fieldName} must be a non-empty object`,
        });

/**
 * POST /api/practice/scenario
 * Requires: userGoal (string, min 1 char)
 */
export const setupScenarioSchema = z.object({
    userGoal: z
        .string({ required_error: 'userGoal is required' })
        .min(1, 'userGoal must not be empty'),
});

/**
 * POST /api/practice/interact
 * Validates the text fields sent alongside the audio file (Multer handles the file).
 * Requires: scenarioStr (valid JSON string), conversationHistoryStr (valid JSON string)
 */
export const interactAudioSchema = z.object({
    scenarioStr: jsonString('scenarioStr'),
    conversationHistoryStr: jsonString('conversationHistoryStr'),
});

/**
 * POST /api/practice/livekit-session
 * Requires: scenarioStr (valid JSON string), conversationHistoryStr (valid JSON string)
 */
export const livekitSessionSchema = z.object({
    scenarioStr: jsonString('scenarioStr'),
    conversationHistoryStr: jsonString('conversationHistoryStr'),
});

/**
 * POST /api/practice/gemini-live-session
 * Requires: scenarioStr (valid JSON string)
 */
export const geminiLiveSessionSchema = z.object({
    scenarioStr: jsonString('scenarioStr'),
});

/**
 * POST /api/practice/gemini-direct-token
 * Requires: scenarioStr (valid JSON string)
 */
export const geminiDirectTokenSchema = z.object({
    scenarioStr: jsonString('scenarioStr'),
});

/**
 * POST /api/practice/analyze
 * Requires: rubricStr (valid JSON string), audioFileKeys (string[]), fullTranscript (string)
 */
export const evaluateSessionSchema = z.object({
    rubricStr: jsonString('rubricStr'),
    audioFileKeys: z.array(z.string(), {
        required_error: 'audioFileKeys is required',
    }),
    fullTranscript: z.string({ required_error: 'fullTranscript is required' }),
});

/**
 * POST /api/practice/hints
 * Requires: scenarioStr (valid JSON string), conversationHistoryStr (valid JSON string)
 */
export const generateHintsSchema = z.object({
    scenarioStr: jsonString('scenarioStr'),
    conversationHistoryStr: jsonString('conversationHistoryStr'),
});

/**
 * POST /api/practice/scenario/adjust
 * Requires: currentScenario (non-empty object), adjustmentText (string, min 1 char)
 */
export const adjustScenarioSchema = z.object({
    currentScenario: nonEmptyObject('currentScenario'),
    adjustmentText: z
        .string({ required_error: 'adjustmentText is required' })
        .min(1, 'adjustmentText must not be empty'),
});

/**
 * POST /api/practice/scenario/suggestions
 * Requires: currentScenario (non-empty object)
 */
export const suggestionsSchema = z.object({
    currentScenario: nonEmptyObject('currentScenario'),
});

/**
 * POST /api/practice/mentor-chat
 * Requires: scenario, evaluationReport, userMessage, conversationHistory
 */
export const mentorChatSchema = z.object({
    scenario: nonEmptyObject('scenario'),
    evaluationReport: nonEmptyObject('evaluationReport'),
    userMessage: z.string().min(1, 'Tin nhắn không được để trống'),
    conversationHistory: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string()
    }))
});

/**
 * POST /api/practice/challenge/generate
 */
export const generateChallengeSchema = z.object({
    sessionId: z.string().uuid('Invalid Session ID')
});

/**
 * POST /api/practice/challenge/deadline
 */
export const setDeadlineSchema = z.object({
    challengeId: z.string().uuid('Invalid Challenge ID'),
    deadline: z.string().datetime('Must be valid ISO8601 datetime')
});

/**
 * POST /api/practice/challenge/report
 */
export const reportChallengeSchema = z.object({
    challengeId: z.string().uuid('Invalid Challenge ID')
});
