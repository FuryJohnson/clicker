import { User, CreateUserData, UpdateUserData } from '../../../domain/entities/user.entity.js';
import { UserRepository } from '../../../domain/repositories/user.repository.js';
import { UserModel, UserFields } from '../models/user.model.js';

export class MongoUserRepository implements UserRepository {
  async findByTelegramId(telegramId: number): Promise<User | null> {
    const doc = await UserModel.findOne({ telegramId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findByTelegramIds(telegramIds: number[]): Promise<User[]> {
    const docs = await UserModel.find({ telegramId: { $in: telegramIds } }).lean();
    const userMap = new Map(docs.map((doc) => [doc.telegramId, this.toEntity(doc)]));
    return telegramIds.map((id) => userMap.get(id)).filter((user): user is User => user !== undefined);
  }

  async create(data: CreateUserData): Promise<User> {
    const doc = await UserModel.create({
      ...data,
      clicks: 0,
    });
    return this.toEntity(doc);
  }

  async update(telegramId: number, data: UpdateUserData): Promise<User | null> {
    const doc = await UserModel.findOneAndUpdate(
      { telegramId },
      { $set: data },
      { new: true }
    ).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async incrementClicks(telegramId: number, count: number): Promise<User | null> {
    const doc = await UserModel.findOneAndUpdate(
      { telegramId },
      { $inc: { clicks: count } },
      { new: true }
    ).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async getTopUsers(limit: number): Promise<User[]> {
    const docs = await UserModel.find().sort({ clicks: -1 }).limit(limit).lean();
    return docs.map((doc) => this.toEntity(doc));
  }

  async countUsersWithMoreClicks(clicks: number): Promise<number> {
    return UserModel.countDocuments({ clicks: { $gt: clicks } });
  }

  private toEntity(doc: UserFields & { _id?: unknown }): User {
    return {
      id: doc._id?.toString(),
      telegramId: doc.telegramId,
      username: doc.username,
      firstName: doc.firstName,
      lastName: doc.lastName,
      clicks: doc.clicks,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
