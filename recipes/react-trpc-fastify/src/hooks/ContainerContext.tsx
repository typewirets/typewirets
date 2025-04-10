import { type ResolutionContext, TypeWireContainer } from "@typewirets/core";
import { createContext } from "react";

export const ContainerContext = createContext<ResolutionContext>(
  new TypeWireContainer(),
);
