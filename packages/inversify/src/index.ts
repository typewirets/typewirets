import type {
  Container,
  ResolutionContext as InnversifyResolutionContext,
  ContainerModuleLoadOptions,
  BindingScope,
} from "inversify";
import type {
  TypeSymbol,
  AnyTypeSymbol,
  AnyTypeWire,
  ResolutionContext as TypeWireResolutionContext,
  BindingContext,
} from "@typewirets/core";

export function adoptScope(scope?: string): BindingScope | undefined {
  if (!scope) {
    return undefined;
  }

  switch (scope.toLowerCase()) {
    case "singleton":
      return "Singleton";
    case "transient":
      return "Transient";
    case "request":
      return "Request";
  }
}

export function adaptToResolutionContext(
  container: Container | InnversifyResolutionContext,
): TypeWireResolutionContext {
  return {
    getSync<T>(typeSymbol: TypeSymbol<T>): T {
      return container.get(typeSymbol.symbol);
    },
    get<T>(typeSymbol: TypeSymbol<T>): Promise<T> {
      return container.getAsync(typeSymbol.symbol);
    },
  } satisfies TypeWireResolutionContext;
}

export function adaptToBindingContext(
  container: Container | ContainerModuleLoadOptions,
): BindingContext {
  return {
    bind(binding: AnyTypeWire) {
      const bound = container
        .bind(binding.type.symbol)
        .toDynamicValue((ctx) => {
          const tCtx = adaptToResolutionContext(ctx);
          return binding.creator(tCtx);
        });

      const scope = adoptScope(binding.scope);
      if (scope) {
        switch (scope) {
          case "Singleton":
            bound.inSingletonScope();
            break;
          case "Transient":
            bound.inTransientScope();
            break;
          case "Request":
            bound.inRequestScope();
        }
      }
    },

    async unbind(typeSymbol: AnyTypeSymbol): Promise<void> {
      await container.unbind(typeSymbol.symbol);
    },

    isBound(typeSymbol: AnyTypeSymbol): boolean {
      return container.isBound(typeSymbol.symbol);
    },
  } satisfies BindingContext;
}

/**
 * Adapter class that provides both TypeWire ResolutionContext and BindingContext
 * interfaces on top of an Inversify container.
 */
export class InversifyAdapter
  implements TypeWireResolutionContext, BindingContext
{
  private readonly resolutionContext: TypeWireResolutionContext;
  readonly bindingContext: BindingContext;

  constructor(readonly container: Container) {
    this.resolutionContext = adaptToResolutionContext(container);
    this.bindingContext = adaptToBindingContext(container);
  }

  getSync<T>(typeSymbol: AnyTypeSymbol): T {
    return this.resolutionContext.getSync(typeSymbol);
  }

  get<T>(typeSymbol: TypeSymbol<T>): Promise<T> {
    return this.resolutionContext.get(typeSymbol);
  }

  bind(typeWire: AnyTypeWire): void | Promise<void> {
    return this.bindingContext.bind(typeWire);
  }

  async unbind(typeSymbol: AnyTypeSymbol): Promise<void> {
    await this.bindingContext.unbind(typeSymbol);
  }

  isBound(typeSymbol: AnyTypeSymbol): boolean {
    return this.bindingContext.isBound(typeSymbol);
  }
}

/**
 * Creates an adapter that provides both TypeWire ResolutionContext and BindingContext
 * interfaces using an Inversify container.
 *
 * @param container The Inversify container to adapt
 * @returns An object implementing both TypeWire interfaces
 */
export function createInversifyAdapter(
  container: Container,
): TypeWireResolutionContext & BindingContext {
  return new InversifyAdapter(container);
}
