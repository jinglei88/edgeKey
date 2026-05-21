import type { PrismaClient } from "../../../generated/prisma/client";
import { getTurnstileConfig } from "../../../server/turnstile";

export type Data = ReturnType<typeof data>;

export async function data(pageContext: { prisma: PrismaClient }) {
  const config = getTurnstileConfig();
  return {
    turnstileEnabled: config.enabled,
  };
}
