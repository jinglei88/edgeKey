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

  try {
    const products = await prisma.licenseProduct.findMany({
      orderBy: { createdAt: "desc" },
    });

    const licenses = await prisma.license.findMany({
      orderBy: { createdAt: "desc" },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const licensesWithProduct = licenses.map((l) => ({
      ...l,
      product: productMap.get(l.productId) || null,
    }));

    return { products, licenses: licensesWithProduct };
  } catch (error) {
    console.error("Failed to load license data:", error);
    return { products: [], licenses: [] };
  }
}
