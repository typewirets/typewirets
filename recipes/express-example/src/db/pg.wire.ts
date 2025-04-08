import { ConfigServiceWire } from "../config/config-service.wire";
import { typeWireOf } from "@typewirets/core";
import { z } from "zod";
import * as pg from "pg";

export const DbConfigSchema = z.object({
  host: z.string(),
  user: z.string().optional(),
  port: z.number().optional(),
  password: z.string().optional(),
  database: z.string().optional(),
  connectionTimeoutMillis: z.number().optional(),
  idleTimeoutMillis: z.number().optional(),
  max: z.number().optional(),
  allowExitOnIdle: z.boolean().optional(),
});

export const PgPoolWire = typeWireOf({
  token: "PgPool",
  async creator(ctx) {
    const config = await ConfigServiceWire.getInstance(ctx);
    const postgreConfig = DbConfigSchema.parse(
      config.get("datasources.postgres"),
    );
    return new pg.Pool(postgreConfig);
  },
});
