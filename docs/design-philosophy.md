# TypeWire Design Philosophy

This document outlines the core design principles and philosophy behind TypeWire, explaining why certain architectural decisions were made and how they benefit developers.

## Core Principles

### 1. Explicit over Implicit

TypeWire favors explicit dependencies over ambient context:

- Dependencies are clearly visible in constructor parameters and creator functions
- No hidden dependencies that rely on global state or ambient context
- Every component clearly states what it needs to function

**Benefits:**
- Easier to understand what each component depends on
- More testable code as dependencies can be easily mocked
- No surprises when running in different environments

### 2. Composition over Inheritance

TypeWire encourages functional composition of definitions:

- Definitions are immutable, encouraging a functional programming approach
- New definitions can be created by composing existing ones
- Behavior can be extended without modifying existing definitions

**Benefits:**
- Better testing capabilities
- More flexible configuration
- Easier to reason about behavior

### 3. Singleton by Default

We promote a singleton-first approach:

- Singleton services create a clearer mental model of your application
- Side-effect producing code is encapsulated in well-defined services
- Resources are better managed and shared

**Benefits:**
- Simplified reasoning about application state
- Better resource management
- Cleaner separation between stateful and stateless code

Instead of relying on request scopes, we recommend:
- Passing contextual information explicitly as method parameters
- Using stateless services that operate on provided data
- Separating business logic from contextual concerns

### 4. Container Agnostic

TypeWire is designed to work with any container:

- Core interfaces are minimal and adaptable
- Adapter pattern allows integration with existing DI containers
- No tight coupling to a specific container implementation

**Benefits:**
- No vendor lock-in
- Can be integrated into existing projects
- Flexible deployment options

### 5. Minimal Runtime Overhead

We prioritize keeping the runtime footprint small:

- No decorators that require metadata reflection
- Minimal runtime type checking
- Simple implementation with focused responsibilities

**Benefits:**
- Smaller bundle size
- Better performance
- Works well in tree-shaking build systems

## From Problems to Solutions

| Common Problem | TypeWire Solution |
|----------------|-------------------|
| Circular dependencies | Built-in detection with clear error messages showing the exact dependency path |
| Runtime type erasure | TypedSymbol approach preserves type information at compile time while using symbols at runtime |
| Container lock-in | Adapter pattern and minimal interfaces allow changing containers with minimal code changes |
| Hidden dependencies | Explicit dependency declaration in creator functions makes all dependencies visible |
| Testing difficulties | Immutable definitions with withCreator() make mocking and testing straightforward |
| Complex configuration | Functional composition allows for gradual configuration instead of complex options objects |

## When to Use TypeWire

TypeWire is ideal for:
- Projects where compile-time type safety is a priority
- Applications seeking to minimize bundle size
- Teams that value explicit dependency graphs
- Projects that may need to switch containers later
- Codebases where testability is important

It may not be the best fit for:
- Projects heavily reliant on decorator metadata
- Applications that require extensive use of request-scoping
- Cases where the container itself needs to be hidden from application code
- Projects already deeply invested in a specific DI container with no adapter

## Design Decisions Explained

### Why Symbols Instead of Classes?

TypeWire uses symbols as the primary identifier for bindings rather than constructor functions:

- Symbols provide guaranteed uniqueness, preventing accidental collisions
- They don't require the class to be decorated or modified
- They work with any type, not just classes
- They don't add metadata to your classes

### Why Not Use Decorators?

While decorators are popular in other DI solutions, we chose not to use them because:

- They require additional compilation settings
- They add runtime metadata to your classes
- They create a tight coupling between your domain classes and the DI system
- They don't work well with tree-shaking

### Why Separate Creation from Resolution?

TypeWire separates the definition of how to create a dependency (TypeWireDefinition) from the actual resolution (ResolutionContext):

- Clearer separation of concerns
- More flexible composition possibilities
- Better testability as each aspect can be tested independently
- Easier to adapt to different container implementations 