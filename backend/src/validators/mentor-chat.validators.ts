import { z } from 'zod';

/**
 * POST /api/mentor-chat/send
 */
export const sendMessageSchema = z.object({
    message: z.string().min(1, 'Tin nhắn không được để trống').max(2000),
});
