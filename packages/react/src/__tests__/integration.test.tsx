import {
  TypeWireContainer,
  typeWireOf,
  typeWireGroupOf,
  type ResolutionContext,
} from "@typewirets/core";
import { describe, beforeEach, it, expect, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { useTypeWire, ResolutionContextProvider } from "../index";

describe("@typewirets/react", () => {
  let container: TypeWireContainer;

  const ApiWire = typeWireOf({
    token: "Api",
    creator() {
      return {
        async tellApiThatWeAreAllGood() {},
        async tellApiThatWeAreDoomed() {},
      };
    },
  });

  const CountStoreWire = typeWireOf({
    token: "CountStore",
    imports: {
      api: ApiWire,
    },
    createWith({ api }) {
      let count = 0;
      return {
        getCount() {
          return count;
        },
        increment() {
          count++;
          if (count === 10) {
            api.tellApiThatWeAreAllGood();
          }
        },
        decrement() {
          count--;
          if (count === 0) {
            api.tellApiThatWeAreDoomed();
          }
        },
      };
    },
  });

  beforeEach(async () => {
    container = new TypeWireContainer();
    vi.clearAllMocks();
  });

  // Create test components
  function CounterDisplay() {
    const countStore = useTypeWire(CountStoreWire);
    return (
      <div>
        <div data-testid="count-value">{countStore.getCount()}</div>
        <button
          type="button"
          data-testid="increment-btn"
          onClick={() => countStore.increment()}
        >
          Increment
        </button>
        <button
          type="button"
          data-testid="decrement-btn"
          onClick={() => countStore.decrement()}
        >
          Decrement
        </button>
      </div>
    );
  }

  function TestApp(props: { container: ResolutionContext }) {
    return (
      <ResolutionContextProvider resolutionContext={props.container}>
        <CounterDisplay />
      </ResolutionContextProvider>
    );
  }

  it("should properly integrate with React components", async () => {
    // Register mocked API wire
    const wireGroup = typeWireGroupOf([
      CountStoreWire,
      ApiWire.withCreator(async (ctx, original) => {
        const obj = await original(ctx);
        vi.spyOn(obj, "tellApiThatWeAreDoomed");
        vi.spyOn(obj, "tellApiThatWeAreAllGood");
        return obj;
      }),
    ]);
    await wireGroup.apply(container);

    // Render the component
    render(<TestApp container={container} />);
    // await vi.advanceTimersToNextTimerAsync();

    // Wait for the component to render with data
    await waitFor(() => {
      expect(screen.getByTestId("count-value").textContent).toBe("0");
    });

    // Test increment functionality
    for (let i = 0; i < 11; i++) {
      act(() => {
        screen.getByTestId("increment-btn").click();
      });
    }

    // expect(screen.getByTestId("count-value").textContent).toBe("10");
    const apiSpy = await ApiWire.getInstance(container);
    expect(apiSpy.tellApiThatWeAreAllGood).toHaveBeenCalledTimes(1);
    expect(apiSpy.tellApiThatWeAreDoomed).not.toHaveBeenCalled();

    // Test decrement functionality
    for (let i = 0; i < 11; i++) {
      act(() => {
        screen.getByTestId("decrement-btn").click();
      });
    }

    // expect(screen.getByTestId("count-value").textContent).toBe("0");
    expect(apiSpy.tellApiThatWeAreDoomed).toHaveBeenCalledTimes(1);
  });
});
