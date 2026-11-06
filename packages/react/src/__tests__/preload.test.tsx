import { TypeWireContainer, type TypeWire, typeWireOf } from "@typewirets/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Component, StrictMode, Suspense, type ReactNode } from "react";
import { ResolutionContextProvider, usePreload, useTypeWire } from "../index";

// Preloading moves the async work before render: after it, components read
// their wires synchronously and no Suspense fallback appears.

afterEach(cleanup);

function asyncWire<T>(token: string, value: () => T | Promise<T>) {
  const calls = { count: 0 };
  const wire = typeWireOf({
    token,
    creator: async () => {
      calls.count += 1;
      return await value();
    },
  });
  return { wire, calls };
}

/** A Suspense fallback that records each time it renders. */
function fallbackRecorder() {
  const renders = { count: 0 };
  function Fallback() {
    renders.count += 1;
    return <div>loading</div>;
  }
  return { Fallback, renders };
}

class Boundary extends Component<
  { children: ReactNode },
  { error: unknown; caught: number }
> {
  state = { error: undefined as unknown, caught: 0 };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch() {
    this.setState((s) => ({ caught: s.caught + 1 }));
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error & { reason?: string };
      return (
        <div data-testid="error" data-reason={err.reason ?? ""}>
          {err.message}
        </div>
      );
    }
    return this.props.children;
  }
}

function Show<T>(props: { wire: TypeWire<T>; testId: string }) {
  const value = useTypeWire(props.wire);
  return <div data-testid={props.testId}>{JSON.stringify(value)}</div>;
}

describe("useTypeWire with a preloaded wire", () => {
  const cases: [string, unknown][] = [
    ["an object", { ok: true }],
    ["0", 0],
    ['""', ""],
    ["false", false],
    ["null", null],
  ];

  for (const [name, value] of cases) {
    it(`renders ${name} on the first render, with no fallback`, async () => {
      const { wire } = asyncWire(`Value-${name}`, () => value);
      const container = new TypeWireContainer();
      await wire.apply(container);
      await container.preload();
      const { Fallback, renders } = fallbackRecorder();

      render(
        <ResolutionContextProvider resolutionContext={container}>
          <Suspense fallback={<Fallback />}>
            <Show wire={wire} testId="value" />
          </Suspense>
        </ResolutionContextProvider>,
      );

      expect(screen.getByTestId("value").textContent).toBe(
        JSON.stringify(value),
      );
      expect(renders.count).toBe(0);
    });
  }
});

describe("usePreload({ wires })", () => {
  async function setup() {
    const config = asyncWire("Config", () => ({ region: "eu" }));
    const flags = asyncWire("Flags", () => ({ beta: false }));
    const container = new TypeWireContainer();
    await config.wire.apply(container);
    await flags.wire.apply(container);
    const outer = fallbackRecorder();
    const inner = fallbackRecorder();

    function Route() {
      usePreload({ wires: [config.wire, flags.wire] });
      return (
        <Suspense fallback={<inner.Fallback />}>
          <Show wire={config.wire} testId="config" />
          <Show wire={flags.wire} testId="flags" />
        </Suspense>
      );
    }

    function App() {
      return (
        <ResolutionContextProvider resolutionContext={container}>
          <Suspense fallback={<outer.Fallback />}>
            <Route />
          </Suspense>
        </ResolutionContextProvider>
      );
    }

    return { App, config, flags, outer, inner };
  }

  it("shows one fallback for the set, then renders the subtree without suspending again", async () => {
    const { App, outer, inner } = await setup();

    render(<App />);
    expect(screen.getByText("loading")).toBeTruthy();

    await waitFor(() =>
      expect(screen.getByTestId("config").textContent).toBe('{"region":"eu"}'),
    );
    expect(screen.getByTestId("flags").textContent).toBe('{"beta":false}');
    expect(outer.renders.count).toBeGreaterThan(0);
    expect(inner.renders.count).toBe(0);
  });

  it("creates each wire once, also under StrictMode", async () => {
    const { App, config, flags, inner } = await setup();

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByTestId("flags")).toBeTruthy());
    expect(config.calls.count).toBe(1);
    expect(flags.calls.count).toBe(1);
    expect(inner.renders.count).toBe(0);
  });

  it("sends a failing creation to the error boundary, and doesn't retry it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = asyncWire<string>("Broken", () =>
      Promise.reject(new Error("flags service down")),
    );
    const container = new TypeWireContainer();
    await broken.wire.apply(container);

    function Route() {
      usePreload({ wires: [broken.wire] });
      return <div>ready</div>;
    }

    render(
      <ResolutionContextProvider resolutionContext={container}>
        <Boundary>
          <Suspense fallback={<div>loading</div>}>
            <Route />
          </Suspense>
        </Boundary>
      </ResolutionContextProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("error").textContent).toBe(
        "flags service down",
      ),
    );
    expect(broken.calls.count).toBe(1);
    vi.restoreAllMocks();
  });

  it("skips transient wires", async () => {
    let created = 0;
    const requestWire = typeWireOf({
      token: "Request",
      scope: "transient",
      creator: async () => {
        created += 1;
        return {};
      },
    });
    const container = new TypeWireContainer();
    await requestWire.apply(container);

    function Route() {
      usePreload({ wires: [requestWire] });
      return <div data-testid="ready">ready</div>;
    }

    render(
      <ResolutionContextProvider resolutionContext={container}>
        <Suspense fallback={<div>loading</div>}>
          <Route />
        </Suspense>
      </ResolutionContextProvider>,
    );

    expect(screen.getByTestId("ready")).toBeTruthy();
    expect(created).toBe(0);
  });
});

describe("a wire nobody preloaded", () => {
  it("suspends, then renders", async () => {
    const { wire } = asyncWire("Late", () => "late");
    const container = new TypeWireContainer();
    await wire.apply(container);

    render(
      <ResolutionContextProvider resolutionContext={container}>
        <Suspense fallback={<div>loading</div>}>
          <Show wire={wire} testId="late" />
        </Suspense>
      </ResolutionContextProvider>,
    );

    expect(screen.getByText("loading")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId("late").textContent).toBe('"late"'),
    );
  });
});

describe("a mounted reader", () => {
  it("stops re-rendering once its value is shown", async () => {
    const { wire } = asyncWire("Steady", () => 0);
    const container = new TypeWireContainer();
    await wire.apply(container);
    const renders = { count: 0 };
    function Counting() {
      renders.count += 1;
      const value = useTypeWire(wire);
      return <div data-testid="steady">{value}</div>;
    }

    render(
      <ResolutionContextProvider resolutionContext={container}>
        <Suspense fallback={<div>loading</div>}>
          <Counting />
        </Suspense>
      </ResolutionContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("steady").textContent).toBe("0"),
    );
    const settled = renders.count;
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(renders.count).toBe(settled);
  });
});

describe("useTypeWire(wire, { suspend: false })", () => {
  function Strict<T>(props: { wire: TypeWire<T> }) {
    const value = useTypeWire(props.wire, { suspend: false });
    return <div data-testid="strict">{JSON.stringify(value)}</div>;
  }

  it("throws NotPreloaded, naming the wire, instead of showing a fallback", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { wire } = asyncWire("AuthService", () => ({ user: "ada" }));
    const container = new TypeWireContainer();
    await wire.apply(container);
    const { Fallback, renders } = fallbackRecorder();

    render(
      <ResolutionContextProvider resolutionContext={container}>
        <Boundary>
          <Suspense fallback={<Fallback />}>
            <Strict wire={wire} />
          </Suspense>
        </Boundary>
      </ResolutionContextProvider>,
    );

    const error = screen.getByTestId("error");
    expect(error.dataset.reason).toBe("NotPreloaded");
    expect(error.textContent).toContain("AuthService");
    expect(renders.count).toBe(0);
    vi.restoreAllMocks();
  });

  it("renders a preloaded wire", async () => {
    const { wire } = asyncWire("AuthService", () => ({ user: "ada" }));
    const container = new TypeWireContainer();
    await wire.apply(container);
    await container.preload({ wires: [wire] });

    render(
      <ResolutionContextProvider resolutionContext={container}>
        <Strict wire={wire} />
      </ResolutionContextProvider>,
    );

    expect(screen.getByTestId("strict").textContent).toBe('{"user":"ada"}');
  });

  it("still reports a non-retriable error as itself", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const container = new TypeWireContainer();
    const transient = typeWireOf({
      token: "Transient",
      scope: "transient",
      creator: async () => 1,
    });
    await transient.apply(container);

    render(
      <ResolutionContextProvider resolutionContext={container}>
        <Boundary>
          <Strict wire={transient} />
        </Boundary>
      </ResolutionContextProvider>,
    );

    const error = screen.getByTestId("error");
    expect(error.dataset.reason).toBe("AsyncOnlyBinding");
    vi.restoreAllMocks();
  });
});
