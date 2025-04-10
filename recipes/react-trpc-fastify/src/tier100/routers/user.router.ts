import { TRPCError } from "@trpc/server";
import type { TRPC } from "@typewirets/react-fastify/tier10/trpc";
import type { UserStore } from "@typewirets/react-fastify/tier50/users/user.store";
import { UserType } from "@typewirets/react-fastify/tier50/users/user.type";
import { type } from "arktype";

export type UserRouterOpt = {
  trpc: TRPC;
  userStore: UserStore;
};

export const ByIdInputType = type("string");

export type ByIdInput = typeof ByIdInputType.infer;

export const LoginInputType = type({
  id: "string",
  password: "string",
});

export function createUserRouter(opt: UserRouterOpt) {
  const { trpc, userStore } = opt;

  return trpc.router({
    users: {
      me: trpc.procedure.query(async (opts) => {
        if (!(await opts.ctx.isAuthenticated())) {
          return {
            authenticated: false,
          };
        }

        const userId = await opts.ctx.getCurrentUserId();
        if (!userId) {
          return {
            authenticated: false,
          };
        }

        const user = await userStore.getUserById(userId);
        return {
          authenticated: true,
          user,
        };
      }),

      byId: trpc.procedure.input(ByIdInputType).query(async (opt) => {
        if (!(await opt.ctx.isAuthenticated())) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Must Login",
          });
        }
        return userStore.getUserById(opt.input);
      }),

      login: trpc.procedure.input(LoginInputType).mutation(async (opt) => {
        const { id } = opt.input;
        const user = await userStore.getUserById(id);
        if (user) {
          await opt.ctx.authenticate(user.id);
        }

        return user;
      }),

      logout: trpc.procedure.mutation(async (opt) => {
        if (await opt.ctx.isAuthenticated()) {
          await opt.ctx.clearUser();
          return { result: true };
        }

        return { result: false };
      }),

      save: trpc.procedure.input(UserType).mutation(async (opts) => {
        if (!(await opts.ctx.isAuthenticated())) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Must Login",
          });
        }

        const userToSave = opts.input;
        await userStore.save(userToSave);
        return userStore.getUserById(userToSave.id);
      }),

      delete: trpc.procedure.input(ByIdInputType).mutation(async (opt) => {
        if (!(await opt.ctx.isAuthenticated())) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Must Login",
          });
        }

        await userStore.delete(opt.input);
      }),

      getAll: trpc.procedure.query(async (opt) => {
        if (!(await opt.ctx.isAuthenticated())) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Must Login",
          });
        }
        return userStore.getAll();
      }),
    },
  });
}

export type UserRouter = ReturnType<typeof createUserRouter>;
