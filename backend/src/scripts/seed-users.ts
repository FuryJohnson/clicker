import 'dotenv/config';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { UserModel } from '../infrastructure/database/models/user.model.js';
import { redis } from '../infrastructure/redis/connection.js';
import { ClicksSortedSet } from '../infrastructure/redis/clicks-sorted-set.js';

const SEED_COUNT = 100;
const SEED_TELEGRAM_ID_START = 100000000;

interface SeedUser {
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  clicks: number;
}

const generateUsers = (count: number): SeedUser[] => {
  const users: SeedUser[] = [];
  
  for (let i = 0; i < count; i++) {
    const hasLastName = Math.random() > 0.1;
    const hasUsername = Math.random() > 0.2;
    
    users.push({
      telegramId: SEED_TELEGRAM_ID_START + i,
      firstName: faker.person.firstName(),
      lastName: hasLastName ? faker.person.lastName() : null,
      username: hasUsername ? faker.internet.username().toLowerCase() : null,
      clicks: faker.number.int({ min: 0, max: 50000 }),
    });
  }
  
  users.sort((a, b) => b.clicks - a.clicks);
  
  return users;
};

const seedDatabase = async (): Promise<void> => {
  console.log('🌱 Starting database seeding...\n');

  const uri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/clicker';
  
  console.log('📦 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ MongoDB connected\n');

  console.log('🗑️  Cleaning up old seed data...');
  const deleteResult = await UserModel.deleteMany({ 
    telegramId: { $gte: SEED_TELEGRAM_ID_START } 
  });
  console.log(`✅ Deleted ${deleteResult.deletedCount} old seed users\n`);

  console.log(`🎲 Generating ${SEED_COUNT} fake users...`);
  const users = generateUsers(SEED_COUNT);
  console.log('✅ Users generated\n');

  console.log('💾 Inserting users into MongoDB...');
  await UserModel.insertMany(users);
  console.log('✅ Users inserted\n');

  console.log('📊 Initializing Redis sorted set...');
  const clicksSortedSet = new ClicksSortedSet(redis);
  
  await redis.del('clicks:ranking');
  
  await clicksSortedSet.initFromMongo(
    users.map((u) => ({ telegramId: u.telegramId, clicks: u.clicks }))
  );
  console.log('✅ Redis sorted set initialized\n');

  console.log('📈 Top 10 users:');
  users.slice(0, 10).forEach((user, index) => {
    console.log(
      `  ${index + 1}. ${user.firstName} ${user.lastName || ''} (@${user.username || 'no_username'}) - ${user.clicks.toLocaleString()} clicks`
    );
  });

  console.log('\n✅ Seeding completed successfully!');
  console.log(`   Total users: ${SEED_COUNT}`);
  console.log(`   Telegram ID range: ${SEED_TELEGRAM_ID_START} - ${SEED_TELEGRAM_ID_START + SEED_COUNT - 1}`);
};

seedDatabase()
  .then(() => {
    mongoose.disconnect();
    redis.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    mongoose.disconnect();
    redis.disconnect();
    process.exit(1);
  });

