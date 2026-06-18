import type { PrismaClient } from "../../../../generated/prisma/client";

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

  const [products, licenses] = await Promise.all([
    prisma.licenseProduct.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.license.findMany({
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { products, licenses };
}
