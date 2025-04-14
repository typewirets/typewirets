import { type } from "arktype";

export const ServerConfigType = type({
  port: "number?",
  enableLogging: "boolean?",
});

export type ServerConfigRecord = typeof ServerConfigType.infer;
