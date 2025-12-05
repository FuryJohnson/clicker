import { Router } from 'express';
import { validateTelegram } from '../middleware/telegram.middleware.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.middleware.js';
import { auth, addClicks, getLeaderboard, getUser, getUserRank } from '../controllers/user.controller.js';
import { clickRateLimitStrategy } from '../../../config/container.js';

const router = Router();

router.use(validateTelegram);

router.post('/auth', auth);
router.get('/user', getUser);
router.get('/user/rank', getUserRank);
router.post('/click', createRateLimitMiddleware(clickRateLimitStrategy), addClicks);
router.get('/leaderboard', getLeaderboard);

export { router as userRoutes };
