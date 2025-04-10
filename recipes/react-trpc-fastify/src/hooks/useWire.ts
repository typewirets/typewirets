import * as React from "react";
import { type TypeWire, TypeWireError } from "@typewirets/core";
import { useContainer } from "./useContainer";

export function useWire<T>(typeWire: TypeWire<T>): T {
  const container = useContainer();
  const [value, setValue] = React.useState(() => {
    try {
      return typeWire.getInstanceSync(container);
    } catch (err: unknown) {
      if (err instanceof TypeWireError && err.reason === "AsyncOnlyBinding") {
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
