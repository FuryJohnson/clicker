export interface User {
  id?: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  clicks: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserData {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
}

export interface UpdateUserData {
  username?: string | null;
  firstName?: string;
  lastName?: string | null;
}
