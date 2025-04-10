import type {
  ResolutionContext,
  TypeWire,
  TypeSymbol,
  AnyTypeWire,
} from "@typewirets/core";
import { ContainerContext } from "./hooks/ContainerContext";
import { Suspense } from "react";
import { TRPCProvider } from "./tier120/trpc.client";
import { TRPCClientWire } from "./tier120/trpc.client.wire";
import { QueryClientWire } from "./tier120/react-query.client.wire";
import { QueryClientProvider } from "@tanstack/react-query";
import { useWire } from "./hooks/useWire";
import { ClientScreen } from "./ClientScreen";
import { Toaster } from "sonner";

export function Providers() {
  const trpcClient = useWire(TRPCClientWire);
  const queryClient = useWire(QueryClientWire);
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <ClientScreen />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

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
        console.log("resolved");
        this.#resolutions.delete(typeSymbol.symbol);
      });
  }
}

export function BrowserApp(props: {
  container: ResolutionContext;
}) {
  const { container } = props;
  const resolutionContext =
    container instanceof ReactResolutionContext
      ? container
      : new ReactResolutionContext(container);
  return (
    <ContainerContext value={resolutionContext}>
      <Suspense fallback={<div>loading</div>}>
        <Providers />
        <Toaster />
      </Suspense>
    </ContainerContext>
  );
}
