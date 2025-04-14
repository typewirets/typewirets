import { useContext } from "react";
import { ContainerContext } from "./ContainerContext";

export function useContainer() {
  return useContext(ContainerContext);
}
