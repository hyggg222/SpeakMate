import { Router } from 'express';
import { StoryBankController } from '../controllers/storybank.controller';
import { authRequired, authOptional } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
    storyChatSchema,
    structureStorySchema,
    saveStorySchema,
    updateStorySchema,
    compareStorySchema,
} from '../validators/storybank.validators';

const router = Router();
const controller = new StoryBankController();

// Chat with Mentor Ni for story exploration — no auth needed
router.post('/chat', authOptional, validate(storyChatSchema), (req, res) =>
    controller.chatForStory(req, res)
);

// AI structuring — no auth needed (doesn't save to DB)
router.post('/structure', authOptional, validate(structureStorySchema), (req, res) =>
    controller.structureStory(req, res)
);

// Story Bank comparison (post-gym analysis)
router.post('/compare', authRequired, validate(compareStorySchema), (req, res) =>
    controller.compareWithStoryBank(req, res)
);

// CRUD — requires authentication (personal data)
router.post('/', authRequired, validate(saveStorySchema), (req, res) =>
    controller.saveStory(req, res)
);

router.get('/', authRequired, (req, res) =>
    controller.listStories(req, res)
);

router.get('/:id', authRequired, (req, res) =>
    controller.getStory(req, res)
);

router.put('/:id', authRequired, validate(updateStorySchema), (req, res) =>
    controller.updateStory(req, res)
);

router.delete('/:id', authRequired, (req, res) =>
    controller.deleteStory(req, res)
);

export default router;
