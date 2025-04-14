import { type } from "arktype";

export const UserType = type({
  id: "string",
  name: "string",
  age: "number",
});

export type User = typeof UserType.infer;
