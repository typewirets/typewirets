import { typeWireOf } from "@typewirets/core";
import type { UserService } from "./user-service";
import { InMemoryUserServiceWire } from "./user-service.memory";

export const UserServiceWire = typeWireOf({
  token: "UserServiceWire",
  imports: {
    inMemoryUserService: InMemoryUserServiceWire,
  },
  createWith({ inMemoryUserService }): UserService {
    return inMemoryUserService satisfies UserService;
  },
});
