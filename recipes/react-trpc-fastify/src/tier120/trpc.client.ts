"use client";

import type { AppRouter } from "@typewirets/react-fastify/tier110/app-router.wire";
import { createTRPCContext } from "@trpc/tanstack-react-query";

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();
