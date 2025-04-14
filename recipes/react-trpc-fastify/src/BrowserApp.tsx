import type { ResolutionContext } from "@typewirets/core";
import { ResolutionContextProvider, useTypeWire } from "@typewirets/react";
import { Suspense } from "react";
import { TRPCProvider } from "./tier120/trpc.client";
import { TRPCClientWire } from "./tier120/trpc.client.wire";
import { QueryClientWire } from "./tier120/react-query.client.wire";
import { QueryClientProvider } from "@tanstack/react-query";
import { ClientScreen } from "./ClientScreen";
import { Toaster } from "sonner";

export function Providers() {
  const trpcClient = useTypeWire(TRPCClientWire);
  const queryClient = useTypeWire(QueryClientWire);
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <ClientScreen />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

export function BrowserApp(props: {
  container: ResolutionContext;
}) {
  const { container } = props;
  return (
    <ResolutionContextProvider resolutionContext={container}>
      <Suspense fallback={<div>loading</div>}>
        <Providers />
        <Toaster />
      </Suspense>
    </ResolutionContextProvider>
  );
}
