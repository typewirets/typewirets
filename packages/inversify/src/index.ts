import type {
  Container,
  ResolutionContext as InnversifyResolutionContext,
  ContainerModuleLoadOptions,
  BindingScope,
} from "inversify";
import type {
  TypedSymbol,
  TypeWireDefinition,
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
    get<T>(symbol: TypedSymbol<T>): T {
      return container.get(symbol.symbol);
    },
    getAsync<T>(symbol: TypedSymbol<T>): Promise<T> {
      return container.getAsync(symbol.symbol);
    },
  } satisfies TypeWireResolutionContext;
}

export function adaptToBindingContext(
  container: Container | ContainerModuleLoadOptions,
): BindingContext {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: bind can take any type
    bind(binding: TypeWireDefinition<any>) {
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

    // biome-ignore lint/suspicious/noExplicitAny: unbind can take any type
    async unbind(symbol: TypedSymbol<any>): Promise<void> {
      await container.unbind(symbol.symbol);
    },

    // biome-ignore lint/suspicious/noExplicitAny: isBound can take any TypeSymbol
    isBound(symbol: TypedSymbol<any>): boolean {
      return container.isBound(symbol.symbol);
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

  get<T>(typedSymbol: TypedSymbol<T>): T {
    return this.resolutionContext.get(typedSymbol);
  }

  getAsync<T>(typedSymbol: TypedSymbol<T>): Promise<T> {
    return this.resolutionContext.getAsync(typedSymbol);
  }

  bind(typeWire: TypeWireDefinition<unknown>): void | Promise<void> {
    return this.bindingContext.bind(typeWire);
  }

  async unbind(typedSymbol: TypedSymbol<unknown>): Promise<void> {
    await this.bindingContext.unbind(typedSymbol);
  }

  isBound(typedSymbol: TypedSymbol<unknown>): boolean {
    return this.bindingContext.isBound(typedSymbol);
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
