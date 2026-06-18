export type Data = ReturnType<typeof data>;

export async function data(pageContext: any) {
  if (pageContext.session?.user?.role !== "admin") {
    return { products: [], licenses: [] };
  }

  try {
    const prisma = pageContext.prisma;
    const products = await prisma.licenseProduct.findMany();
    const licenses = await prisma.license.findMany();

    const productMap = new Map(products.map((p: any) => [p.id, p]));
    const result = licenses.map((l: any) => ({
      ...l,
      product: productMap.get(l.productId) || null,
    }));

    return { products, licenses: result };
  } catch (e: any) {
    console.error("license keys data error:", e?.message || e);
    return { products: [], licenses: [] };
  }
}
