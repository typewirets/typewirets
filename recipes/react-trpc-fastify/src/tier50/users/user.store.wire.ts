import { typeWireOf } from "@typewirets/core";
import type { UserStore } from "./user.store";
import type { User } from "./user.type";

class InMemoryUserStore {
  #users: Map<string, User> = new Map();

  constructor() {
    // init with default admin user
    const userId = "admin";
    this.#users.set(userId, {
      id: userId,
      name: "SuperAdmin",
      // old thus wise
      age: 9999999,
    });
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.#users.get(id);
  }

  async save(user: User): Promise<void> {
    this.#users.set(user.id, user);
  }

  async getAll(): Promise<User[]> {
    return Array.from(this.#users.values());
  }

  async delete(id: string): Promise<void> {
    this.#users.delete(id);
  }
}

export const UserStoreWire = typeWireOf({
  token: "UserStore",
  creator(_ctx) {
    const userStore = new InMemoryUserStore();
    return userStore satisfies UserStore;
  },
});
