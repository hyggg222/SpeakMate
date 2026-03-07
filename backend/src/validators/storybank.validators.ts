import { z } from 'zod';

/**
 * POST /api/storybank/structure
 * Sends raw input to AI for STAR structuring.
 */
export const structureStorySchema = z.object({
    rawInput: z.string({ required_error: 'rawInput is required' })
        .min(10, 'Nội dung phải có ít nhất 10 ký tự'),
    inputMethod: z.enum(['text', 'voice', 'upload'], {
        required_error: 'inputMethod is required',
    }),
    followUpAnswers: z.array(z.string()).optional(),
    framework: z.enum(['STAR', 'PREP', 'CAR']).optional(),
    chatHistory: z.array(z.object({
        role: z.enum(['user', 'mentor']),
        content: z.string(),
        fieldTargeted: z.string().nullable().optional(),
    })).optional(),
});

/**
 * POST /api/storybank/
 * Saves a structured story to the database.
 */
export const saveStorySchema = z.object({
    title: z.string().min(1, 'Tiêu đề không được trống').max(200),
    rawInput: z.string().min(1),
    inputMethod: z.enum(['text', 'voice', 'upload']),
    framework: z.enum(['STAR', 'PREP', 'CAR']).default('STAR'),
    structured: z.object({
        situation: z.string().min(1),
        task: z.string().min(1),
        action: z.string().min(1),
        result: z.string().min(1),
    }),
    fullScript: z.string().min(1).max(1500),
    estimatedDuration: z.number().int().min(1).max(300).default(30),
    tags: z.array(z.string().max(30)).max(10).default([]),
    status: z.enum(['draft', 'ready', 'battle-tested']).default('draft'),
});

/**
 * POST /api/storybank/compare
 * Compares a story with practice transcript.
 */
export const compareStorySchema = z.object({
    storyId: z.string().uuid('Invalid Story ID'),
    sessionId: z.string().uuid('Invalid Session ID').optional(),
    transcript: z.string().min(1, 'Transcript is required'),
});

/**
 * POST /api/storybank/chat
 * Sends a chat message to Mentor Ni for story idea exploration.
 */
export const storyChatSchema = z.object({
    framework: z.enum(['STAR', 'PREP', 'CAR']),
    initialInput: z.string().min(1, 'initialInput is required'),
    inputMethod: z.enum(['text', 'voice', 'upload']),
    chatMessages: z.array(z.object({
        role: z.enum(['user', 'mentor']),
        content: z.string(),
        fieldTargeted: z.string().nullable().optional(),
    })).default([]),
});

/**
 * PUT /api/storybank/:id
 * Partially updates a story.
 */
export const updateStorySchema = z.object({
    title: z.string().min(1).max(200).optional(),
    structured: z.object({
        situation: z.string().min(1),
        task: z.string().min(1),
        action: z.string().min(1),
        result: z.string().min(1),
    }).optional(),
    fullScript: z.string().min(1).max(1500).optional(),
    estimatedDuration: z.number().int().min(1).max(300).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
    status: z.enum(['draft', 'ready', 'battle-tested']).optional(),
    framework: z.enum(['STAR', 'PREP', 'CAR']).optional(),
});
