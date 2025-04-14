import * as React from "react";
import {
  type ResolutionContext,
  type TypeSymbol,
  type TypeWire,
  TypeWireError,
  TypeWireContainer,
} from "@typewirets/core";

export class ReactResolutionContext {
  readonly #resolutionContext: ResolutionContext;
  readonly #resolutions: Map<symbol, Promise<unknown>> = new Map();
  readonly #resolutionErrors: Map<symbol, unknown> = new Map();

  constructor(resolutionContext: ResolutionContext) {
    this.#resolutionContext = resolutionContext;
  }

  getSync<T>(typeSymbol: TypeSymbol<T>): T {
    if (this.#resolutionErrors.has(typeSymbol.symbol)) {
      throw this.#resolutionErrors.get(typeSymbol.symbol);
    }
    return this.#resolutionContext.getSync(typeSymbol);
  }

  async get<T>(typeSymbol: TypeSymbol<T>): Promise<T> {
    if (this.#resolutionErrors.has(typeSymbol.symbol)) {
      throw this.#resolutionErrors.get(typeSymbol.symbol);
    }

    const promise = this.#resolutions.get(typeSymbol.symbol) as Promise<T>;
    if (promise) {
      return promise;
    }

    const newResolution = this.#resolutionContext.get(typeSymbol);
    this.#resolutions.set(typeSymbol.symbol, newResolution);
    return newResolution
      .catch((err) => {
        this.#resolutionErrors.set(typeSymbol.symbol, err);
        throw err;
      })
      .finally(() => {
        this.#resolutions.delete(typeSymbol.symbol);
      });
  }
}

export const ContainerContext = React.createContext<ResolutionContext>(
  new ReactResolutionContext(new TypeWireContainer()),
);

export function useContainer() {
  const container = React.useContext(ContainerContext);
  return container;
}

export function useTypeWire<T>(typeWire: TypeWire<T>): T {
  const container = useContainer();
  const [value, setValue] = React.useState(() => {
    try {
      return typeWire.getInstanceSync(container);
    } catch (err: unknown) {
      if (err instanceof TypeWireError && err.retriable) {
        return null;
      }

      throw err;
    }
  });

  const promise = typeWire.getInstance(container);
  React.useEffect(() => {
    let mounted = false;

    promise
      .then((value) => {
        if (mounted) {
          console.log("we got the value", value);
          setValue(() => value);
        }
      })
      .catch((err) => {
        console.error(err);
      });
    return () => {
      mounted = false;
    };
  }, [promise]);

  if (value) {
    return value;
  }

  throw promise;
}

export function ResolutionContextProvider(props: {
  resolutionContext: ResolutionContext;
  children?: React.ReactNode;
}) {
  const resolutionContext =
    props.resolutionContext instanceof ReactResolutionContext
      ? props.resolutionContext
      : new ReactResolutionContext(props.resolutionContext);
  return (
    <ContainerContext value={resolutionContext}>
      {props.children}
    </ContainerContext>
  );
}
