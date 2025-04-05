# TypeWire Express Example

This recipe demonstrates how to use TypeWire in an Express.js application, showcasing dependency injection and service organization.

## Project Structure

```
src/
├── config/           # Configuration management
├── db/              # Database connections and utilities
├── routes/          # Express routes
├── services/        # Business logic and services
├── main.ts          # Application entry point
└── main.wires.ts    # Wire definitions and groupings
```

## Key Concepts

### Wire Definitions

TypeWire uses explicit wire definitions to manage dependencies. Each service typically has:

1. An interface file (e.g., `user-service.ts`):
```typescript
export interface User {
  id: string;
  name: string;
  age: number;
}

export interface UserService {
  getUserById(id: string): Promise<User | undefined>;
  save(user: User): Promise<void>;
}
```

2. Implementation files (e.g., `user-service.memory.ts`):
```typescript
import type { User } from "./user-service";
import { typeWireOf } from "@typewirets/core";

export class InMemoryUserService {
  constructor(private readonly userStore: Record<string, User> = {}) {}

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
```

3. Interface wire file (e.g., `user-service.wire.ts`):
```typescript
import { typeWireOf } from "@typewirets/core";
import type { UserService } from "./user-service";
import { InMemoryUserServiceWire } from "./user-service.memory";

export const UserServiceWire = typeWireOf<UserService>({
  token: "UserServiceWire",
  async creator(ctx) {
    return InMemoryUserServiceWire.getInstance(ctx);
  },
});
```

### Wire Grouping

Wires can be grouped for better organization and initialization:

```typescript
// main.wires.ts
import { typeWireOf } from "@typewirets/core";

export const PreloadWires = [
  JsoncConfigRecordWire,
  ConfigServiceWire,
];

export const AppWires = [
  UserServiceWire,
  InMemoryUserServiceWire,
  SaveUserRouteWire,
  GetUserRouteWire,
];
```

### Async vs Sync Access

TypeWire provides both async and sync access patterns:

```typescript
// Async access (default)
const userService = await container.getInstance(UserServiceWire);

// Sync access (requires preloading)
try {
  const userService = container.getInstanceSync(UserServiceWire);
} catch (error) {
  // Handle error if wire wasn't preloaded
}
```

## Example Usage

### Express Route
```typescript
import { typeWireOf } from "@typewirets/core";
import type { Request, Response } from "express";
import type { UserService } from "../services/user-service";

export const SaveUserRouteWire = typeWireOf({
  token: "SaveUserRoute",
  async creator(ctx) {
    const userService = await UserServiceWire.getInstance(ctx);
    return async (req: Request, res: Response) => {
      const user = req.body;
      await userService.save(user);
      res.status(201).send();
    };
  },
});
```

### Application Setup
```typescript
async function main() {
  const container = new TypeWireContainer();

  // Load configuration first
  await loadWires(container, PreloadWires);
  
  // Then load application wires
  await loadWires(container, AppWires);
  
  const config = await ConfigServiceWire.getInstance(container);
  const app = express();

  app.use(express.json());
  await loadRoutes(app, container);

  const port = config.get("server.port") ?? 3000;
  app.listen(port);
}

main();
```

## Error Handling

1. **Sync Access Errors**
```typescript
try {
  const service = container.getInstanceSync(ServiceWire);
} catch (error) {
  if (error instanceof NotPreloadedError) {
    // Handle not preloaded case
  }
}
```

2. **Async Errors**
```typescript
try {
  const service = await container.getInstance(ServiceWire);
} catch (error) {
  // Handle async error
}
```

## Contributing

Feel free to submit issues and enhancement requests.

## License

This project is licensed under the MIT License. 