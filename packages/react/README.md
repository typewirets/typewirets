# TypeWire React

React integration for TypeWireTS - seamlessly integrate TypeWire dependency injection with React components.

## Installation

```bash
npm install @typewirets/react @typewirets/core
```

## Quick Start

The most effective pattern for using TypeWire with React is with an async main function:

```tsx
import { TypeWireContainer, typeWireGroupOf } from "@typewirets/core";
import { ResolutionContextProvider } from "@typewirets/react";
import ReactDOM from "react-dom/client";
import { ApiWire } from "./wires/api.wire";
import { UserStoreWire } from "./wires/user-store.wire";
import { App } from "./App";

async function main() {
  // Create the container
  const container = new TypeWireContainer();
  
  // Group all your TypeWires
  const wireGroup = typeWireGroupOf([
    ApiWire,
    UserStoreWire,
    // Add all your application wires here
  ]);

  // Apply all wires to the container at once
  await wireGroup.apply(container);
  
  // Render your React app with the container
  const rootEl = document.getElementById("root");
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App container={container} />);
}

// Start your application
main().catch(console.error);
```

Then in your App component:

```tsx
import { ResolutionContextProvider } from "@typewirets/react";
import type { ResolutionContext } from "@typewirets/core";
import { Suspense } from "react";

export function App({ container }: { container: ResolutionContext }) {
  return (
    <ResolutionContextProvider resolutionContext={container}>
      <Suspense fallback={<div>Loading application...</div>}>
        <YourComponents />
      </Suspense>
    </ResolutionContextProvider>
  );
}
```

## Defining TypeWires for React

When defining TypeWires for React, use the `createWith` pattern for better dependency management:

```tsx
// api.wire.ts
import { typeWireOf } from "@typewirets/core";

export const ApiWire = typeWireOf({
  token: "Api",
  createWith() {
    return {
      async fetchUsers() {
        const response = await fetch("/api/users");
        return response.json();
      },
      async updateUser(id: string, data: any) {
        // Implementation
      }
    };
  },
});

// user-store.wire.ts
import { typeWireOf } from "@typewirets/core";
import { create } from "zustand";
import { ApiWire } from "./api.wire";

export const UserStoreWire = typeWireOf({
  token: "UserStore",
  imports: {
    api: ApiWire,
  },
  createWith({ api }) {
    return create((set) => ({
      users: [],
      loading: false,
      error: null,
      
      fetchUsers: async () => {
        set({ loading: true });
        try {
          const users = await api.fetchUsers();
          set({ users, loading: false });
        } catch (error) {
          set({ error, loading: false });
        }
      },
      
      updateUser: async (id: string, data: any) => {
        // Implementation
      }
    }));
  },
});
```

## Using TypeWires in Components

Access your TypeWires in React components with the `useTypeWire` hook:

```tsx
import { useTypeWire } from "@typewirets/react";
import { UserStoreWire } from "./wires/user-store.wire";
import { useEffect } from "react";

export function UserList() {
  const userStore = useTypeWire(UserStoreWire);
  const { users, loading, error, fetchUsers } = userStore;
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Handling Async TypeWires

When using TypeWires with async initialization, React Suspense handles the loading state:

```tsx
// Component that depends on an async TypeWire
function UserDashboard() {
  const userStore = useTypeWire(UserStoreWire);
  
  // If UserStoreWire has async initialization,
  // React Suspense will catch the promise and show the fallback
  
  return <UserList />;
}

// In your parent component
function App({ container }) {
  return (
    <ResolutionContextProvider resolutionContext={container}>
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <UserDashboard />
      </Suspense>
    </ResolutionContextProvider>
  );
}
```

## Core Components

- **ResolutionContextProvider**: Provides TypeWire container to React components
- **useTypeWire**: Hook to access TypeWire instances in components
- **useContainer**: Direct access to the ResolutionContext (advanced use cases)

## Best Practices

1. **Initialize TypeWires in a main function**:
   - Group your TypeWires with `typeWireGroupOf`
   - Apply them all at once before rendering

2. **Use state management libraries with TypeWire**:
   - Zustand, Redux, or MobX work well with TypeWire
   - Inject TypeWires as dependencies using `imports` and `createWith`

3. **Structure your application by features**:
   - Group related TypeWires by feature
   - Co-locate TypeWires with their React components

4. **Ensure proper cleanup**:
   - If your TypeWires need cleanup, register cleanup handlers
   - Use React's useEffect for component-level cleanup

## License

MIT 