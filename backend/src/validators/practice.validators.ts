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
