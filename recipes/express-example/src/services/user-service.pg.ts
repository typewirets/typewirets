import { PgPoolWire } from "../db/pg.wire";
import type { User, UserService } from "./user-service";
import { typeWireOf } from "@typewirets/core";

export const PgUserServiceWire = typeWireOf({
  token: "PgUserService",
  // embedded style
  // if you do not mind mixing implementation with wire
  async creator(ctx) {
    const pgPool = await PgPoolWire.getInstance(ctx);
    return {
      async getUserById(id: string) {
        const client = await pgPool.connect();
        try {
          const res = await client.query(
            "SELECT * FROM users WHERE id = $1 LIMIT 1 ",
            [id],
          );

          if (res.rowCount === 1) {
            return res.rows[0] as User;
          }
        } finally {
          client.release();
        }
      },

      async save(user: User) {
        const client = await pgPool.connect();
        try {
          const { id, name, age } = user;
          await client.query(
            "INSERT INTO users (id, name, age) VALUSE($1, $2, $3)",
            [id, name, age],
          );
        } finally {
          client.release();
        }
      },
    } satisfies UserService;
  },
});
