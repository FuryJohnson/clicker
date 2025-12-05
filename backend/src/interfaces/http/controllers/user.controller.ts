import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, TelegramUser } from '../middleware/telegram.middleware.js';
import {
  authUserUseCase,
  addClicksUseCase,
  getLeaderboardUseCase,
  getUserUseCase,
  getUserRankUseCase,
} from '../../../config/container.js';

const unauthorizedError = new Error('Unauthorized');
const invalidClickCountError = new Error('Invalid click count');

const requireUser = (req: AuthenticatedRequest): TelegramUser => {
  if (!req.telegramUser) {
    throw unauthorizedError;
  } 
  return req.telegramUser;
};

export const auth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tgUser = requireUser(req);

    const result = await authUserUseCase.execute({
      telegramId: tgUser.id,
      username: tgUser.username || null,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name || null,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const addClicks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tgUser = requireUser(req);

    const count = parseInt(req.body.count, 10);
    if (isNaN(count)) {
      throw invalidClickCountError;
    }

    const result = await addClicksUseCase.execute({
      telegramId: tgUser.id,
      count,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await getLeaderboardUseCase.execute();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserRank = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tgUser = requireUser(req);
    const result = await getUserRankUseCase.execute(tgUser.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tgUser = requireUser(req);
    const result = await getUserUseCase.execute(tgUser.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
