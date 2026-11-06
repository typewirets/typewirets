import {
  TypeWireContainer,
  typeWireOf,
  type TypeSymbol,
  type TypeWire,
} from "@typewirets/core";
import { afterEach, describe, it, expect } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { Component, Suspense, useState, type ReactNode } from "react";
import {
  ReactResolutionContext,
  ResolutionContextProvider,
  useTypeWire,
} from "../index";

// After `unbind` and a re-apply, components must see the new binding, never a
// creation that was started for the binding that was removed.

type Connection = { label: string };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// Every wire below binds this one symbol, so applying one replaces another.
const ConnectionToken = Symbol("Connection");
const ConnectionSymbol: TypeSymbol<Connection> = { symbol: ConnectionToken };

function connectionWire(create: () => Promise<Connection>) {
  return typeWireOf({ token: ConnectionToken, createWith: create });
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown }
> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div data-testid="error">{String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}

function Reader(props: { wire: TypeWire<Connection>; testId: string }) {
  const connection = useTypeWire(props.wire);
  return <div data-testid={props.testId}>{connection.label}</div>;
}

describe("ReactResolutionContext after unbind and re-apply", () => {
  afterEach(cleanup);

  it("get resolves to the new binding's value while a creation for the old binding is still pending", async () => {
    const container = new TypeWireContainer();
    const old = deferred<Connection>();
    await connectionWire(() => old.promise).apply(container);
    const context = new ReactResolutionContext(container);

    const before = context.get(ConnectionSymbol);
    await container.unbind(ConnectionSymbol);
    await connectionWire(async () => ({ label: "new" })).apply(container);
    const after = context.get(ConnectionSymbol);
    old.resolve({ label: "old" });

    expect((await before).label).toBe("old");
    expect((await after).label).toBe("new");
  });

  it("a component mounted after the re-apply shows the new value, not the pending old creation", async () => {
    const container = new TypeWireContainer();
    const old = deferred<Connection>();
    const OldWire = connectionWire(() => old.promise);
    const NewWire = connectionWire(async () => ({ label: "new" }));
    await OldWire.apply(container);

    let showSecond: (show: boolean) => void = () => {};
    function Host() {
      const [second, setSecond] = useState(false);
      showSecond = setSecond;
      return (
        <>
          <Suspense fallback={<div>loading first</div>}>
            <Reader wire={OldWire} testId="first" />
          </Suspense>
          {second && (
            <Suspense fallback={<div>loading second</div>}>
              <Reader wire={NewWire} testId="second" />
            </Suspense>
          )}
        </>
      );
    }

    // The provider renders once, so every reader shares one ReactResolutionContext.
    render(
      <ResolutionContextProvider resolutionContext={container}>
        <Host />
      </ResolutionContextProvider>,
    );
    await screen.findByText("loading first");

    await container.unbind(ConnectionSymbol);
    await NewWire.apply(container);
    act(() => showSecond(true));

    // The old creation never finishes here: a reader waiting on it would hang.
    await waitFor(() =>
      expect(screen.getByTestId("second").textContent).toBe("new"),
    );

    // Once the old creation does finish, the first reader also shows the new
    // binding's value, because the old value was never cached.
    await act(async () => old.resolve({ label: "old" }));
    await waitFor(() =>
      expect(screen.getByTestId("first").textContent).toBe("new"),
    );
  });
});

describe("a failing async wire read through useTypeWire", () => {
  afterEach(cleanup);

  it("reaches the error boundary after one creation, instead of retrying under Suspense", async () => {
    let created = 0;
    const FailingWire = connectionWire(async () => {
      created += 1;
      throw new Error("connection refused");
    });
    const container = new TypeWireContainer();
    await FailingWire.apply(container);

    render(
      <ResolutionContextProvider resolutionContext={container}>
        <ErrorBoundary>
          <Suspense fallback={<div>loading</div>}>
            <Reader wire={FailingWire} testId="value" />
          </Suspense>
        </ErrorBoundary>
      </ResolutionContextProvider>,
    );

    expect((await screen.findByTestId("error")).textContent).toBe(
      "Error: connection refused",
    );
    // Give a retry loop time to show itself: React retries suspended
    // boundaries on a timer, so a loop would keep creating.
    await act(() => new Promise((r) => setTimeout(r, 500)));
    expect(created).toBe(1);
  });
});
