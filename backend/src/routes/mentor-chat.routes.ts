import { Router } from 'express';
import { MentorChatController } from '../controllers/mentor-chat.controller';
import { authOptional } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendMessageSchema } from '../validators/mentor-chat.validators';

const router = Router();
const controller = new MentorChatController();

// Auth optional — chat works for guests too (without DB persistence)
router.use(authOptional);

router.post('/send', validate(sendMessageSchema), (req, res) =>
    controller.sendMessage(req, res)
);

router.get('/history', (req, res) =>
    controller.getHistory(req, res)
);

router.delete('/clear', (req, res) =>
    controller.clearHistory(req, res)
);

export default router;
