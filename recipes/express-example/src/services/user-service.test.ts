import { describe, it, expect, beforeEach } from "vitest";
import { TypeWireContainer } from "@typewirets/core";
import { UserServiceWire } from "./user-service.wire";
import { InMemoryUserServiceWire } from "./user-service.memory";
import type { User, UserService } from "./user-service";

describe("UserService", () => {
  let container: TypeWireContainer;
  let userService: UserService;

  beforeEach(async () => {
    container = new TypeWireContainer();
    await InMemoryUserServiceWire.apply(container);
    await UserServiceWire.apply(container);
    userService = await UserServiceWire.getInstance(container);
  });

  it("should save and retrieve a user", async () => {
    const user: User = {
      id: "1",
      name: "John Doe",
      age: 30,
    };

    await userService.save(user);
    const retrievedUser = await userService.getUserById("1");

    expect(retrievedUser).toEqual(user);
  });

  it("should return undefined when user is not found", async () => {
    const user = await userService.getUserById("non-existent");
    expect(user).toBeUndefined();
  });
});
