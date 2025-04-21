import type { User } from "./user-service";
import { typeWireOf } from "@typewirets/core";

export class InMemoryUserService {
  constructor(private readonly userStore: Record<string, User> = {}) {
    this.userStore.admin = {
      id: "admin",
      name: "admin",
      age: 999999999,
    };
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.userStore[id];
  }

  async save(user: User) {
    this.userStore[user.id] = user;
  }
}

export const InMemoryUserServiceWire = typeWireOf({
  token: "InMemoryUserService",
  creator() {
    return new InMemoryUserService();
  },
});
