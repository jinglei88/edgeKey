import type { PrismaClient } from "../../../../generated/prisma/client";
import { listLicenseProducts, listLicenseKeys } from "../../../../modules/license/service";

export type Data = ReturnType<typeof data>;

export async function data(pageContext: {
  prisma: PrismaClient;
  session?: { user?: { role?: string } };
}) {
  if (pageContext.session?.user?.role !== "admin") {
    return {
      products: [],
      licenses: [],
    };
  }

  const prisma = pageContext.prisma;

  return {
    products: await listLicenseProducts(prisma),
    licenses: await listLicenseKeys(undefined, prisma),
  };
}
