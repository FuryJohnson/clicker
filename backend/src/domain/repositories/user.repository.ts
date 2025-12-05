import { User, CreateUserData, UpdateUserData } from '../entities/user.entity.js';

export interface UserRepository {
  findByTelegramId(telegramId: number): Promise<User | null>;
  findByTelegramIds(telegramIds: number[]): Promise<User[]>;
  create(data: CreateUserData): Promise<User>;
  update(telegramId: number, data: UpdateUserData): Promise<User | null>;
  incrementClicks(telegramId: number, count: number): Promise<User | null>;
  getTopUsers(limit: number): Promise<User[]>;
  countUsersWithMoreClicks(clicks: number): Promise<number>;
}
