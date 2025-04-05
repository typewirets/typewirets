import type { Application } from "express";
import type { ResolutionContext } from "@typewirets/core";
import { GetUserRouteWire } from "./get-user.route";
import { SaveUserRouteWire } from "./save-user.route";

export async function loadRoutes(app: Application, ctx: ResolutionContext) {
  const getUserRoute = await GetUserRouteWire.getInstance(ctx);
  const saveUserRoute = await SaveUserRouteWire.getInstance(ctx);

  app.get("/api/users/:id", getUserRoute);
  app.post("/api/users", saveUserRoute);
}
