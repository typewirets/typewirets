import { typeWireGroupOf } from "@typewirets/core";
import { JsoncConfigRecordWire } from "./config/config-record.jsonc.wire";
import { ConfigServiceWire } from "./config/config-service.wire";
import { SaveUserRouteWire } from "./routes/save-user.route";
import { GetUserRouteWire } from "./routes/get-user.route";
import { UserServiceWire } from "./services/user-service.wire";
import { InMemoryUserServiceWire } from "./services/user-service.memory";
// import { PgPoolWire } from "./db/pg.wire";

export const PreloadWires = typeWireGroupOf([
  JsoncConfigRecordWire,
  ConfigServiceWire,
]);

export const AppWires = typeWireGroupOf([
  UserServiceWire,
  InMemoryUserServiceWire,
  SaveUserRouteWire,
  GetUserRouteWire,
  // add pg wire if need to be updated
  // or perhaps conditionally load based of config later.
  // PgPoolWire
]);
