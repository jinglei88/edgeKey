import type { PrismaClient, LicenseType, LicenseStatus, LicenseActivationStatus, LicenseProductStatus } from "../../generated/prisma/client";

export function findProductByCode(prisma: PrismaClient, code: string) {
  return prisma.licenseProduct.findUnique({
    where: { code },
  });
}

export function listProducts(prisma: PrismaClient) {
  return prisma.licenseProduct.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export function createProduct(
  prisma: PrismaClient,
  input: { code: string; name: string; description?: string; apiKey: string },
) {
  return prisma.licenseProduct.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      apiKey: input.apiKey,
    },
  });
}

export function updateProduct(
  prisma: PrismaClient,
  id: number,
  input: { name?: string; description?: string; status?: LicenseProductStatus },
) {
  return prisma.licenseProduct.update({
    where: { id },
    data: input,
  });
}

export function findLicenseByKey(prisma: PrismaClient, key: string) {
  return prisma.license.findUnique({
    where: { key },
    include: { product: true },
  });
}

export function findLicenseById(prisma: PrismaClient, id: number) {
  return prisma.license.findUnique({
    where: { id },
    include: { product: true },
  });
}

export function createLicense(
  prisma: PrismaClient,
  input: {
    productId: number;
    key: string;
    licenseType: LicenseType;
    durationSec: number;
    maxDevices: number;
    metadata?: string;
  },
) {
  return prisma.license.create({
    data: {
      productId: input.productId,
      key: input.key,
      licenseType: input.licenseType,
      durationSec: input.durationSec,
      maxDevices: input.maxDevices,
      metadata: input.metadata,
    },
  });
}

export function updateLicense(
  prisma: PrismaClient,
  id: number,
  data: {
    status?: LicenseStatus;
    activatedAt?: Date;
    expireAt?: Date;
  },
) {
  return prisma.license.update({
    where: { id },
    data,
  });
}

export function listLicenses(
  prisma: PrismaClient,
  filters?: {
    productId?: number;
    licenseType?: LicenseType;
    status?: LicenseStatus;
  },
) {
  const where: Record<string, unknown> = {};
  if (filters?.productId) where.productId = filters.productId;
  if (filters?.licenseType) where.licenseType = filters.licenseType;
  if (filters?.status) where.status = filters.status;

  return prisma.license.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
}

export function findActivation(
  prisma: PrismaClient,
  productId: number,
  licenseId: number,
  deviceId: string,
) {
  return prisma.licenseActivation.findUnique({
    where: {
      productId_licenseId_deviceId: {
        productId,
        licenseId,
        deviceId,
      },
    },
  });
}

export function findActiveActivationByDevice(
  prisma: PrismaClient,
  productId: number,
  deviceId: string,
) {
  return prisma.licenseActivation.findFirst({
    where: {
      productId,
      deviceId,
      status: "ACTIVE",
    },
    include: { license: true },
  });
}

export function createActivation(
  prisma: PrismaClient,
  input: {
    licenseId: number;
    productId: number;
    deviceId: string;
    platform: string;
    domain?: string;
    fingerprint: string;
  },
) {
  return prisma.licenseActivation.create({
    data: {
      licenseId: input.licenseId,
      productId: input.productId,
      deviceId: input.deviceId,
      platform: input.platform,
      domain: input.domain,
      fingerprint: input.fingerprint,
    },
  });
}

export function updateActivation(
  prisma: PrismaClient,
  id: number,
  data: {
    lastSeenAt?: Date;
    status?: LicenseActivationStatus;
  },
) {
  return prisma.licenseActivation.update({
    where: { id },
    data,
  });
}

export function deactivateActivation(prisma: PrismaClient, id: number) {
  return prisma.licenseActivation.update({
    where: { id },
    data: { status: "REVOKED" as LicenseActivationStatus },
  });
}

export function createRevocation(
  prisma: PrismaClient,
  licenseId: number,
  reason: string,
) {
  return prisma.licenseRevocation.create({
    data: {
      licenseId,
      reason,
    },
  });
}

export function countActivationsByLicense(prisma: PrismaClient, licenseId: number) {
  return prisma.licenseActivation.count({
    where: {
      licenseId,
      status: "ACTIVE",
    },
  });
}
