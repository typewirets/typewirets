import { typeWireOf } from "@typewirets/core";
import type { UserService } from "./user-service";
import { InMemoryUserServiceWire } from "./user-service.memory";

export const UserServiceWire = typeWireOf<UserService>({
  token: "UserServiceWire",
  async creator(ctx) {
    return InMemoryUserServiceWire.getInstance(ctx);
  },
});
