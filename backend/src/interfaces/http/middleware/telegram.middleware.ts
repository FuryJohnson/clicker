import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../../../infrastructure/logging/logger.js';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface AuthenticatedRequest extends Request {
  telegramUser?: TelegramUser;
}

const invalidTelegramInitDataError = new Error('Invalid Telegram init data');

export const validateTelegram = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const initData = req.headers['x-telegram-init-data'] as string;

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    logger.error('BOT_TOKEN not configured');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const isDev = process.env.NODE_ENV === 'development' || botToken === 'test_token_for_development';

  // Allow empty initData in development mode
  if (isDev && !initData) {
    req.telegramUser = {
      id: 12345,
      first_name: 'Dev',
      last_name: 'User',
      username: 'dev_user',
    };
    next();
    return;
  }

  if (!initData) {
    res.status(401).json({ error: 'Missing Telegram init data' });
    return;
  }
  if (isDev) {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (userStr) {
      try {
        req.telegramUser = JSON.parse(userStr) as TelegramUser;
        next();
        return;
      } catch {
        throw invalidTelegramInitDataError;
      }
    }
  }

  try {
    const parsed = validateInitData(initData, botToken);
    if (!parsed) {
      throw  invalidTelegramInitDataError;
    }

    req.telegramUser = parsed.user;
    next();
  } catch (error) {
    throw invalidTelegramInitDataError;
  }
};

function validateInitData(initData: string, botToken: string): { user: TelegramUser } | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) return null;

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) {
    return null;
  }

  const authDate = params.get('auth_date');
  if (authDate) {
    const authTimestamp = parseInt(authDate, 10) * 1000;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (now - authTimestamp > oneHour) {
      return null;
    }
  }

  const userStr = params.get('user');
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr) as TelegramUser;
    return { user };
  } catch {
    return null;
  }
}