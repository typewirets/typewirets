import { TypeWireContainer, typeWireOf } from "@typewirets/core";
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { useTypeWire, ResolutionContextProvider } from "../index";

// A createWith wire's creator is async even when createWith is synchronous, so
// useTypeWire's sync path finds the creation in flight on the first render.
// It must wait for that creation instead of starting another one.
describe("useTypeWire creation count", () => {
  afterEach(cleanup);

  function setup() {
    let created = 0;
    const StoreWire = typeWireOf({
      token: "Store",
      imports: {},
      createWith: () => {
        created += 1;
        return { id: created };
      },
    });

    function Reader(props: { testId: string }) {
      const store = useTypeWire(StoreWire);
      return <div data-testid={props.testId}>{store.id}</div>;
    }

    return { StoreWire, Reader, created: () => created };
  }

  async function mount(
    children: React.ReactNode,
    apply: (container: TypeWireContainer) => void | Promise<void>,
  ) {
    const container = new TypeWireContainer();
    await apply(container);
    render(
      <ResolutionContextProvider resolutionContext={container}>
        <React.Suspense fallback={<div>loading</div>}>
          {children}
        </React.Suspense>
      </ResolutionContextProvider>,
    );
  }

  it("creates once for one reader", async () => {
    const { StoreWire, Reader, created } = setup();
    await mount(<Reader testId="a" />, (c) => StoreWire.apply(c));

    await waitFor(() => expect(screen.getByTestId("a").textContent).toBe("1"));
    expect(created()).toBe(1);
  });

  it("creates once for two readers in one Suspense boundary", async () => {
    const { StoreWire, Reader, created } = setup();
    await mount(
      <>
        <Reader testId="a" />
        <Reader testId="b" />
      </>,
      (c) => StoreWire.apply(c),
    );

    await waitFor(() => expect(screen.getByTestId("b").textContent).toBe("1"));
    expect(screen.getByTestId("a").textContent).toBe("1");
    expect(created()).toBe(1);
  });

  it("creates once for one reader under StrictMode", async () => {
    const { StoreWire, Reader, created } = setup();
    await mount(
      <React.StrictMode>
        <Reader testId="a" />
      </React.StrictMode>,
      (c) => StoreWire.apply(c),
    );

    await waitFor(() => expect(screen.getByTestId("a").textContent).toBe("1"));
    expect(created()).toBe(1);
  });
});
