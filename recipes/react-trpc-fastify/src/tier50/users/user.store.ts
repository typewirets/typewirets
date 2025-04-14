import type { User } from "./user.type";

export interface UserStore {
  getUserById(id: string): Promise<User | undefined>;
  getAll(): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}
