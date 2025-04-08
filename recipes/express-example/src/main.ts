import express from "express";
import { TypeWireContainer, combineWireGroups } from "@typewirets/core";
import { PreloadWires, AppWires } from "./main.wires";
import { ConfigServiceWire } from "./config/config-service.wire";
import { loadRoutes } from "./routes/routes";

async function main() {
  const container = new TypeWireContainer();

  const wireGroup = combineWireGroups([PreloadWires, AppWires]);
  await wireGroup.apply(container);

  const config = await ConfigServiceWire.getInstance(container);
  const app = express();

  // configure middlewares
  app.use(express.json());

  // configure routers
  await loadRoutes(app, container);

  // start app
  const port = config.get("server.port") ?? 3000;
  app.listen(port, (err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(`Listening on port: ${port}`);
  });
}

main();
