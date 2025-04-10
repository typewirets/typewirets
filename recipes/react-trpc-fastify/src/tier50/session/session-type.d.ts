import "fastify";
import type { Session } from "@fastify/session";

declare module "fastify" {
  interface FastifyRequest {
    session: Session & {
      authenticated?: boolean;
      userId?: string;
    };
  }
}
