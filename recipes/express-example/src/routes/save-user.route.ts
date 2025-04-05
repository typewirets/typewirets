import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { typeWireOf } from "@typewirets/core";
import { UserServiceWire } from "../services/user-service.wire";

export const SaveUserRequest = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
});

// showing a simple example of embedded wire and implementation
export const SaveUserRouteWire = typeWireOf({
  token: "SaveUserRouter",
  async creator(ctx) {
    const userService = await UserServiceWire.getInstance(ctx);

    // recommended route
    // POST /api/users
    return async (req: Request, res: Response) => {
      try {
        const user = SaveUserRequest.parse(req.body);
        await userService.save(user);
        res.end();
      } catch (err: unknown) {
        if (err instanceof ZodError) {
          // validation error
          res.status(400).json({ errors: err.errors });
          return;
        }

        // throw unknown error so that express can handle it accordingly
        throw err;
      }
    };
  },
});
