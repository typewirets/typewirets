import { describe, it, expect } from "vitest";
import { TypeWireContainer, typeWireOf } from "../index";

// Test interfaces and classes
interface ServiceA {
  getName(): string;
}

interface ServiceB {
  getName(): string;
  getServiceAName(): string;
}

interface ServiceC {
  getName(): string;
  getServiceBName(): string;
}

class ServiceAImpl implements ServiceA {
  getName(): string {
    return "ServiceA";
  }
}

class ServiceBImpl implements ServiceB {
  constructor(private serviceA: ServiceA) {}

  getName(): string {
    return "ServiceB";
  }

  getServiceAName(): string {
    return this.serviceA.getName();
  }
}

class ServiceCImpl implements ServiceC {
  constructor(private serviceB: ServiceB) {}

  getName(): string {
    return "ServiceC";
  }

  getServiceBName(): string {
    return this.serviceB.getName();
  }
}

describe("TypeWireTS Integration", () => {
  it("should resolve a dependency chain correctly", async () => {
    // Arrange
    const container = new TypeWireContainer();

    const serviceAProvider = typeWireOf<ServiceA>({
      token: "serviceA",
      creator: () => new ServiceAImpl(),
    });

    const serviceBProvider = typeWireOf<ServiceB>({
      token: "serviceB",
      creator: (resolver) =>
        new ServiceBImpl(serviceAProvider.getInstance(resolver)),
    });

    const serviceCProvider = typeWireOf<ServiceC>({
      token: "serviceC",
      creator: (resolver) =>
        new ServiceCImpl(serviceBProvider.getInstance(resolver)),
    });

    // Act
    await serviceAProvider.apply(container);
    await serviceBProvider.apply(container);
    await serviceCProvider.apply(container);

    const serviceC = serviceCProvider.getInstance(container);

    // Assert
    expect(serviceC.getName()).toBe("ServiceC");
    expect(serviceC.getServiceBName()).toBe("ServiceB");
  });

  it("should detect circular dependencies", async () => {
    // Arrange
    const container = new TypeWireContainer();

    // Create circular dependency: A -> B -> C -> A
    const serviceAProvider = typeWireOf<ServiceA>({
      token: "serviceA",
      creator: (resolver) => {
        // This creates a circular dependency
        serviceCProvider.getInstance(resolver);
        return new ServiceAImpl();
      },
    });

    const serviceBProvider = typeWireOf<ServiceB>({
      token: "serviceB",
      creator: (resolver) =>
        new ServiceBImpl(serviceAProvider.getInstance(resolver)),
    });

    const serviceCProvider = typeWireOf<ServiceC>({
      token: "serviceC",
      creator: (resolver) =>
        new ServiceCImpl(serviceBProvider.getInstance(resolver)),
    });

    // Act & Assert
    await serviceAProvider.apply(container);
    await serviceBProvider.apply(container);
    await serviceCProvider.apply(container);
    expect(() => serviceCProvider.getInstance(container)).toThrow(
      expect.objectContaining({
        reason: "CircularDependency"
      })
    );
  });

  it("should support async dependency chains", async () => {
    // Arrange
    const container = new TypeWireContainer();

    const serviceAProvider = typeWireOf<ServiceA>({
      token: "serviceA",
      creator: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return new ServiceAImpl();
      },
    });

    const serviceBProvider = typeWireOf<ServiceB>({
      token: "serviceB",
      creator: async (resolver) => {
        const serviceA = await resolver.getAsync(serviceAProvider.type);
        return new ServiceBImpl(serviceA);
      },
    });

    // Act
    await serviceAProvider.apply(container);
    await serviceBProvider.apply(container);

    const serviceB = await serviceBProvider.getInstanceAsync(container);

    // Assert
    expect(serviceB.getName()).toBe("ServiceB");
    expect(serviceB.getServiceAName()).toBe("ServiceA");
  });
});
