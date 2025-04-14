import { describe, it, expect } from "vitest";
import { TypeWireContainer, type AnyTypeWire, typeWireOf } from "../index";

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
        new ServiceBImpl(serviceAProvider.getInstanceSync(resolver)),
    });

    const serviceCProvider = typeWireOf<ServiceC>({
      token: "serviceC",
      creator: (resolver) =>
        new ServiceCImpl(serviceBProvider.getInstanceSync(resolver)),
    });

    // Act
    await serviceAProvider.apply(container);
    await serviceBProvider.apply(container);
    await serviceCProvider.apply(container);

    const serviceC = serviceCProvider.getInstanceSync(container);

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
        serviceCProvider.getInstanceSync(resolver);
        return new ServiceAImpl();
      },
    });

    const serviceBProvider = typeWireOf<ServiceB>({
      token: "serviceB",
      creator: (resolver) =>
        new ServiceBImpl(serviceAProvider.getInstanceSync(resolver)),
    });

    const serviceCProvider = typeWireOf<ServiceC>({
      token: "serviceC",
      creator: (resolver) =>
        new ServiceCImpl(serviceBProvider.getInstanceSync(resolver)),
    });

    // Act & Assert
    await serviceAProvider.apply(container);
    await serviceBProvider.apply(container);
    await serviceCProvider.apply(container);
    expect(() => serviceCProvider.getInstanceSync(container)).toThrow(
      expect.objectContaining({
        reason: "CircularDependency",
        message: `Failed To Resolve serviceC
Reason: CircularDependency
Instruction: Check for circular references in your dependency graph and refactor to break the cycle.
Resolution Path: serviceC -> serviceB -> serviceA -> [serviceC]
`,
      }),
    );
  });

  it("should detect circular dependencies with truncated message", async () => {
    // Arrange
    const container = new TypeWireContainer({
      numberOfPathsToPrint: 5,
    });

    const wires: AnyTypeWire[] = [];
    const first: AnyTypeWire = typeWireOf({
      token: "Service 0",
      creator(ctx) {
        wires[wires.length - 1]?.getInstanceSync(ctx);
        return {};
      },
    });

    wires.push(first);
    let last = first;
    for (let i = 1; i < 100; i++) {
      const lastWire = last;
      const current = typeWireOf({
        token: `Service: ${i}`,
        creator(ctx) {
          lastWire.getInstanceSync(ctx);
          return {};
        },
      });
      last = current;
      wires.push(current);
    }

    // Act & Assert
    for (const wire of wires) {
      await wire.apply(container);
    }

    expect(() => last.getInstanceSync(container)).toThrow(
      expect.objectContaining({
        reason: "CircularDependency",
        message: `Failed To Resolve Service: 99
Reason: CircularDependency
Instruction: Check for circular references in your dependency graph and refactor to break the cycle.
Resolution Path: Service: 99 -> Service: 98 -> Service: 97 -> Service: 96 -> Service: 95 -> ... -> Service 0 -> [Service: 99]
`,
      }),
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
        const serviceA = await resolver.get(serviceAProvider.type);
        return new ServiceBImpl(serviceA);
      },
    });

    // Act
    await serviceAProvider.apply(container);
    await serviceBProvider.apply(container);

    const serviceB = await serviceBProvider.getInstance(container);

    // Assert
    expect(serviceB.getName()).toBe("ServiceB");
    expect(serviceB.getServiceAName()).toBe("ServiceA");
  });
});
