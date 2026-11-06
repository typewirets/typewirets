import { TypeWireContainer, typeWireOf } from "@typewirets/core";
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { StrictMode, Suspense, type ReactNode } from "react";
import { useTypeWire, ResolutionContextProvider } from "../index";

// A singleton with state (a connection, a subscription, a store) must be
// created once, however many times React renders the components that read it.

async function setup() {
  let created = 0;
  const ConnectionWire = typeWireOf({
    token: "Connection",
    createWith: () => {
      created += 1;
      return { id: created };
    },
  });
  const container = new TypeWireContainer();
  await ConnectionWire.apply(container);

  function Reader(props: { testId: string }) {
    const connection = useTypeWire(ConnectionWire);
    return <div data-testid={props.testId}>{connection.id}</div>;
  }

  function App(props: { children: ReactNode }) {
    return (
      <ResolutionContextProvider resolutionContext={container}>
        <Suspense fallback={<div>loading</div>}>{props.children}</Suspense>
      </ResolutionContextProvider>
    );
  }

  return { App, Reader, creations: () => created };
}

describe("a createWith singleton read through useTypeWire", () => {
  afterEach(cleanup);

  it("is created once for one reader", async () => {
    const { App, Reader, creations } = await setup();
    render(
      <App>
        <Reader testId="a" />
      </App>,
    );

    await waitFor(() => expect(screen.getByTestId("a").textContent).toBe("1"));
    expect(creations()).toBe(1);
  });

  it("is created once for two readers in one Suspense boundary", async () => {
    const { App, Reader, creations } = await setup();
    render(
      <App>
        <Reader testId="a" />
        <Reader testId="b" />
      </App>,
    );

    await waitFor(() => expect(screen.getByTestId("b").textContent).toBe("1"));
    expect(screen.getByTestId("a").textContent).toBe("1");
    expect(creations()).toBe(1);
  });

  it("is created once under StrictMode", async () => {
    const { App, Reader, creations } = await setup();
    render(
      <StrictMode>
        <App>
          <Reader testId="a" />
        </App>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByTestId("a").textContent).toBe("1"));
    expect(creations()).toBe(1);
  });
});
