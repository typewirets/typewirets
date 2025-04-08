import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { typeWireOf } from "@typewirets/core";
import { UserServiceWire } from "../services/user-service.wire";

export const UserRequestByIdSchema = z.object({
  id: z.string(),
});

// showing a simple example of embedded wire and implementation
export const GetUserRouteWire = typeWireOf({
  token: "GetUserRoute",
  async creator(ctx) {
    const userService = await UserServiceWire.getInstance(ctx);

    // recommended route
    // /api/users/:id
    return async (req: Request, res: Response) => {
      try {
        const params = UserRequestByIdSchema.parse(req.params);
        const user = await userService.getUserById(params.id);
        if (!user) {
          // not found
          res.status(404).end();
          return;
        }

        res.json(user);
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
