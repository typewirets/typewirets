import { describe, it, expect, beforeEach } from "vitest";
import { TypeWireContainer, typeWireOf, typedSymbolOf } from "../index";

// Test interfaces and classes
interface TestService {
  getValue(): string;
}

class TestServiceImpl implements TestService {
  constructor(private value = "default") {}

  getValue(): string {
    return this.value;
  }
}

interface DependentService {
  getServiceValue(): string;
}

class DependentServiceImpl implements DependentService {
  constructor(private testService: TestService) {}

  getServiceValue(): string {
    return `Dependent: ${this.testService.getValue()}`;
  }
}

describe("TypeWireContainer", () => {
  let container: TypeWireContainer;

  beforeEach(() => {
    container = new TypeWireContainer();
  });

  describe("bind and get", () => {
    it("should bind and retrieve a simple provider", async () => {
      // Arrange
      const testServiceWire = typeWireOf<TestService>({
        token: "testService",
        creator: () => new TestServiceImpl(),
      });

      // Act
      await testServiceWire.apply(container);
      const service = testServiceWire.getInstance(container);

      // Assert
      expect(service).toBeInstanceOf(TestServiceImpl);
      expect(service.getValue()).toBe("default");
    });

    it("should throw when getting an unbound provider", () => {
      // Arrange
      const symbol = typedSymbolOf<TestService>("notBound");

      // Act & Assert
      expect(() => container.get(symbol)).toThrow(/not found/);
    });

    it("should support dependent providers", async () => {
      // Arrange
      const testServiceWire = typeWireOf<TestService>({
        token: "testService",
        creator: () => new TestServiceImpl("test value"),
      });

      const dependentServiceWire = typeWireOf<DependentService>({
        token: "dependentService",
        creator: (resolver) => {
          const testService = resolver.get(testServiceWire.type);
          return new DependentServiceImpl(testService);
        },
      });

      // Act
      await testServiceWire.apply(container);
      await dependentServiceWire.apply(container);
      const service = dependentServiceWire.getInstance(container);

      // Assert
      expect(service).toBeInstanceOf(DependentServiceImpl);
      expect(service.getServiceValue()).toBe("Dependent: test value");
    });
  });

  describe("scopes", () => {
    it("should return the same instance for singleton scope (default)", async () => {
      // Arrange
      const testServiceWire = typeWireOf<TestService>({
        token: "testService",
        creator: () => new TestServiceImpl(),
      });

      // Act
      await testServiceWire.apply(container);
      const service1 = container.get(testServiceWire.type);
      const service2 = container.get(testServiceWire.type);

      // Assert
      expect(service1).toBe(service2); // Same instance
    });

    it("should return different instances for transient scope", async () => {
      // Arrange
      const testServiceWire = typeWireOf<TestService>({
        token: "testService",
        creator: () => new TestServiceImpl(),
        scope: "transient",
      });

      // Act
      await testServiceWire.apply(container);
      const service1 = container.get(testServiceWire.type);
      const service2 = container.get(testServiceWire.type);

      // Assert
      expect(service1).not.toBe(service2); // Different instances
    });
  });

  describe("async support", () => {
    it("should support async creators with getAsync", async () => {
      // Arrange
      const asyncServiceWire = typeWireOf<TestService>({
        token: "asyncService",
        creator: async () => {
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 10));
          return new TestServiceImpl("async value");
        },
      });

      // Act
      await asyncServiceWire.apply(container);
      const service = await container.getAsync(asyncServiceWire.type);

      // Assert
      expect(service).toBeInstanceOf(TestServiceImpl);
      expect(service.getValue()).toBe("async value");
    });

    it("should throw when using get with async creator", async () => {
      // Arrange
      const asyncServiceWire = typeWireOf<TestService>({
        token: "asyncService",
        creator: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return new TestServiceImpl();
        },
      });

      // Act
      await asyncServiceWire.apply(container);

      // Assert
      expect(() => asyncServiceWire.getInstance(container)).toThrow(/promise/i);
    });

    it("should cache singleton async instances", async () => {
      // Arrange
      let createCount = 0;
      const asyncServiceWire = typeWireOf<TestService>({
        token: "asyncService",
        creator: async () => {
          createCount++;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return new TestServiceImpl();
        },
      });

      // Act
      await asyncServiceWire.apply(container);
      const service1 = await container.getAsync(asyncServiceWire.type);
      const service2 = await container.getAsync(asyncServiceWire.type);

      // Assert
      expect(service1).toBe(service2); // Same instance
      expect(createCount).toBe(1); // Creator called only once
    });
  });

  describe("unbind", () => {
    it("should remove a binding", async () => {
      // Arrange
      const testServiceWire = typeWireOf<TestService>({
        token: "testService",
        creator: () => new TestServiceImpl(),
      });

      // Act
      await testServiceWire.apply(container);
      expect(container.isBound(testServiceWire.type)).toBe(true);

      await container.unbind(testServiceWire.type);

      // Assert
      expect(container.isBound(testServiceWire.type)).toBe(false);
      expect(() => container.get(testServiceWire.type)).toThrow(/not found/);
    });

    it("should remove singleton instances when unbinding", async () => {
      // Arrange
      const testServiceWire = typeWireOf<TestService>({
        token: "testService",
        creator: () => new TestServiceImpl(),
      });

      // Act - Get instance to cache it
      await testServiceWire.apply(container);
      const service1 = container.get(testServiceWire.type);

      // Unbind and rebind
      container.unbind(testServiceWire.type);
      await testServiceWire.apply(container);
      const service2 = container.get(testServiceWire.type);

      // Assert
      expect(service1).not.toBe(service2); // Different instances
    });
  });

  describe("provider methods", () => {
    it("should get instance using provider.getInstance", async () => {
      // Arrange
      const testServiceWire = typeWireOf<TestService>({
        token: "testService",
        creator: () => new TestServiceImpl("provider method"),
      });

      // Act
      await testServiceWire.apply(container);
      const service = testServiceWire.getInstance(container);

      // Assert
      expect(service).toBeInstanceOf(TestServiceImpl);
      expect(service.getValue()).toBe("provider method");
    });

    it("should get instance async using provider.getInstanceAsync", async () => {
      // Arrange
      const asyncServiceWire = typeWireOf<TestService>({
        token: "asyncService",
        creator: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return new TestServiceImpl("async provider method");
        },
      });

      // Act
      await asyncServiceWire.apply(container);
      const service = await asyncServiceWire.getInstanceAsync(container);

      // Assert
      expect(service).toBeInstanceOf(TestServiceImpl);
      expect(service.getValue()).toBe("async provider method");
    });
  });

  describe("provider immutability", () => {
    it("should create new provider with different scope", async () => {
      // Arrange
      const singletonWire = typeWireOf<TestService>({
        token: "testService",
        creator: () => new TestServiceImpl(),
      });

      // Act
      const transientWire = singletonWire.withScope("transient");

      // Assert
      expect(transientWire).not.toBe(singletonWire);
      expect(transientWire.scope).toBe("transient");
      expect(singletonWire.scope).toBeUndefined(); // Original unchanged

      // Verify behavior
      await singletonWire.apply(container);
      const singleton1 = container.get(singletonWire.type);
      const singleton2 = container.get(singletonWire.type);
      expect(singleton1).toBe(singleton2); // Same instance

      await transientWire.apply(container);
      const transient1 = container.get(transientWire.type);
      const transient2 = container.get(transientWire.type);
      expect(transient1).not.toBe(transient2); // Different instances
    });

    it("should create new provider with different implementation", async () => {
      // Arrange
      const originalWire = typeWireOf<TestService>({
        token: "testService",
        creator: () => new TestServiceImpl("original"),
      });

      // Act
      const newWire = originalWire.withCreator(
        () => new TestServiceImpl("modified"),
      );

      // Assert
      expect(newWire).not.toBe(originalWire);
      expect(newWire.creator).not.toBe(originalWire.creator);

      // Verify behavior
      await originalWire.apply(container);
      const original = container.get(originalWire.type);
      expect(original.getValue()).toBe("original");

      container.unbind(originalWire.type);
      await newWire.apply(container);
      const modified = container.get(newWire.type);
      expect(modified.getValue()).toBe("modified");
    });
  });
});
