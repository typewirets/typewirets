import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import type { Context } from "@typewirets/react-fastify/tier10/trpc.context";
import type { FastifyRequest } from "fastify/types/request";

export class FastifyTrpcContext implements Context {
  constructor(readonly req: FastifyRequest) {}

  async isAuthenticated(): Promise<boolean> {
    //@ts-ignore
    return this.req.session.authenticated ?? false;
  }

  async getCurrentUserId(): Promise<string | undefined> {
    //@ts-ignore
    return this.req.session.userId;
  }

  async authenticate(userId: string): Promise<void> {
    //@ts-ignore
    this.req.session.authenticated = true;
    //@ts-ignore
    this.req.session.userId = userId;
    await this.req.session.save();
  }

  async clearUser(): Promise<void> {
    //@ts-ignore
    this.req.session.authenticated = false;
    //@ts-ignore
    this.req.session.userId = undefined;
    await this.req.session.destroy();
  }
}

export function createContext({ req }: CreateFastifyContextOptions) {
  return new FastifyTrpcContext(req);
}
