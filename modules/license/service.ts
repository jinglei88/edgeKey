import type { PrismaClient } from "../../generated/prisma/client";
import { badRequestError, conflictError, notFoundError } from "../../lib/app-error";
import { logger } from "../../lib/logger";
import {
  buildCanonicalString,
  buildVerifyCanonicalString,
  computeHmacSha256,
  generateVerifyToken,
  isTimestampValid,
  verifyHmacSha256,
} from "./crypto";
import {
  countActivationsByLicense,
  createActivation,
  createLicense,
  createProduct,
  createRevocation,
  deactivateActivation,
  findActivation,
  findActiveActivationByDevice,
  findLicenseById,
  findLicenseByKey,
  findProductByCode,
  listLicenses,
  listProducts,
  updateActivation,
  updateLicense,
  updateProduct,
} from "./repository";
import type {
  LicenseActivateInput,
  LicenseActivateResult,
  LicenseDeactivateInput,
  LicenseDeactivateResult,
  LicenseGenerateInput,
  LicenseHeartbeatInput,
  LicenseHeartbeatResult,
  LicenseProductInput,
  LicenseType,
  LicenseVerifyInput,
  LicenseVerifyResult,
} from "./types";
import { DURATION_SECONDS, LICENSE_ERROR_CODES } from "./types";
import type { LicenseStatus, LicenseProductStatus } from "../../generated/prisma/client";

const AUTH_SECRET = () => process.env.AUTH_SECRET || "";

function licenseErrorResponse(code: number, message: string) {
  return { code, data: null, message };
}

function licenseSuccessResponse<T>(data: T) {
  return { code: 0, data, message: "success" };
}

function getExpireAt(licenseType: LicenseType, activatedAt: Date): Date | null {
  const durationSec = DURATION_SECONDS[licenseType];
  if (durationSec === 0) return null; // PERMANENT
  return new Date(activatedAt.getTime() + durationSec * 1000);
}

function getLeftSeconds(expireAt: Date | null): number | null {
  if (!expireAt) return null;
  const now = Date.now();
  const diff = expireAt.getTime() - now;
  return Math.max(0, Math.floor(diff / 1000));
}

export async function createLicenseProduct(input: LicenseProductInput, prisma?: PrismaClient) {
  const client = prisma ?? (await import("telefunc").then((m) => m.getContext<{ prisma: PrismaClient }>())).prisma;

  const existing = await findProductByCode(client, input.code);
  if (existing) {
    throw conflictError("产品编码已存在，请使用编辑功能", "PRODUCT_CODE_EXISTS");
  }

  return createProduct(client, {
    code: input.code,
    name: input.name,
    description: input.description,
  });
}

export async function listLicenseProducts(prisma?: PrismaClient) {
  const client = prisma ?? (await import("telefunc").then((m) => m.getContext<{ prisma: PrismaClient }>())).prisma;
  return listProducts(client);
}

export async function updateLicenseProduct(
  id: number,
  input: { name?: string; description?: string; status?: LicenseProductStatus },
  prisma?: PrismaClient,
) {
  const client = prisma ?? (await import("telefunc").then((m) => m.getContext<{ prisma: PrismaClient }>())).prisma;
  return updateProduct(client, id, input);
}

export async function generateLicenseKeys(input: LicenseGenerateInput) {
  const { prisma } = await import("telefunc").then((m) => m.getContext<{ prisma: PrismaClient }>());

  const product = await findProductByCode(prisma, input.productCode);
  if (!product) {
    throw notFoundError("产品不存在", "PRODUCT_NOT_FOUND");
  }

  const keys: string[] = [];
  const maxDevices = input.maxDevices ?? 1;
  const durationSec = DURATION_SECONDS[input.licenseType];

  for (let i = 0; i < input.count; i++) {
    const keySuffix = generateKeySuffix();
    const prefix = input.prefix || input.licenseType;
    const key = `${prefix}-${product.code.toUpperCase()}-${keySuffix}`;

    await createLicense(prisma, {
      productId: product.id,
      key,
      licenseType: input.licenseType,
      durationSec,
      maxDevices,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    });

    keys.push(key);
  }

  return { keys, productCode: input.productCode, licenseType: input.licenseType };
}

export async function listLicenseKeys(filters?: {
  productCode?: string;
  licenseType?: string;
  status?: string;
}, prisma?: PrismaClient) {
  const client = prisma ?? (await import("telefunc").then((m) => m.getContext<{ prisma: PrismaClient }>())).prisma;

  let productId: number | undefined;
  if (filters?.productCode) {
    const product = await findProductByCode(client, filters.productCode);
    if (product) productId = product.id;
  }

  return listLicenses(client, {
    productId,
    licenseType: filters?.licenseType as LicenseType | undefined,
    status: filters?.status as LicenseStatus | undefined,
  });
}

export async function activateLicense(
  input: LicenseActivateInput,
): Promise<LicenseActivateResult> {
  const { prisma } = await import("telefunc").then((m) => m.getContext<{ prisma: PrismaClient }>());

  const product = await findProductByCode(prisma, input.productCode);
  if (!product) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.PRODUCT_NOT_FOUND, "产品不存在");
  }

  if (product.status !== "ACTIVE") {
    return licenseErrorResponse(LICENSE_ERROR_CODES.PRODUCT_NOT_FOUND, "产品已禁用");
  }

  const license = await findLicenseByKey(prisma, input.key);
  if (!license) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.KEY_NOT_FOUND, "Key 不存在");
  }

  if (license.productId !== product.id) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.KEY_PRODUCT_MISMATCH, "Key 与产品不匹配");
  }

  if (license.status !== "ACTIVE") {
    return licenseErrorResponse(LICENSE_ERROR_CODES.KEY_EXPIRED, "Key 已失效");
  }

  const existingActivation = await findActivation(prisma, product.id, license.id, input.deviceId);
  if (existingActivation) {
    const expireAt = license.expireAt;
    const leftSeconds = getLeftSeconds(expireAt);
    const verifyToken = await generateVerifyToken(license.id, input.productCode, input.deviceId);

    return licenseSuccessResponse({
      licenseId: license.id,
      productCode: input.productCode,
      licenseType: license.licenseType as LicenseType,
      status: license.status as any,
      activatedAt: existingActivation.activatedAt.toISOString(),
      expireAt: expireAt?.toISOString() ?? null,
      leftSeconds,
      verifyToken,
    });
  }

  if (license.licenseType === "TRIAL") {
    const trialActivation = await findActiveActivationByDevice(prisma, product.id, input.deviceId);
    if (trialActivation) {
      return licenseErrorResponse(LICENSE_ERROR_CODES.TRIAL_EXHAUSTED, "试用已用完，不可再试");
    }
  }

  const now = new Date();
  const expireAt = getExpireAt(license.licenseType as LicenseType, now);

  await createActivation(prisma, {
    licenseId: license.id,
    productId: product.id,
    deviceId: input.deviceId,
    platform: input.platform,
    domain: input.domain,
    fingerprint: input.fingerprint,
  });

  await updateLicense(prisma, license.id, {
    activatedAt: now,
    expireAt: expireAt ?? undefined,
  });

  const leftSeconds = getLeftSeconds(expireAt);
  const verifyToken = await generateVerifyToken(license.id, input.productCode, input.deviceId);

  logger.info("license.activate", {
    licenseId: license.id,
    productCode: input.productCode,
    licenseType: license.licenseType,
    deviceId: input.deviceId,
  });

  return licenseSuccessResponse({
    licenseId: license.id,
    productCode: input.productCode,
    licenseType: license.licenseType as LicenseType,
    status: "ACTIVE",
    activatedAt: now.toISOString(),
    expireAt: expireAt?.toISOString() ?? null,
    leftSeconds,
    verifyToken,
  });
}

export async function verifyLicense(
  input: LicenseVerifyInput,
): Promise<LicenseVerifyResult> {
  const { prisma } = await import("telefunc").then((m) => m.getContext<{ prisma: PrismaClient }>());

  const product = await findProductByCode(prisma, input.productCode);
  if (!product) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.PRODUCT_NOT_FOUND, "产品不存在");
  }

  const license = await findLicenseById(prisma, input.licenseId);
  if (!license) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.KEY_NOT_FOUND, "Key 不存在");
  }

  if (license.productId !== product.id) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.KEY_PRODUCT_MISMATCH, "Key 与产品不匹配");
  }

  const activation = await findActivation(prisma, product.id, license.id, input.deviceId);
  if (!activation) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.DEVICE_MISMATCH, "设备未激活");
  }

  if (activation.status !== "ACTIVE") {
    return licenseErrorResponse(LICENSE_ERROR_CODES.DEVICE_MISMATCH, "设备已失效");
  }

  if (license.expireAt && license.expireAt.getTime() < Date.now()) {
    await updateLicense(prisma, license.id, { status: "EXPIRED" });
    await updateActivation(prisma, activation.id, { status: "EXPIRED" });
    return licenseErrorResponse(LICENSE_ERROR_CODES.KEY_EXPIRED, "Key 已过期");
  }

  const verifyToken = await generateVerifyToken(license.id, input.productCode, input.deviceId);
  const leftSeconds = getLeftSeconds(license.expireAt);

  return licenseSuccessResponse({
    valid: true,
    productCode: input.productCode,
    licenseType: license.licenseType as LicenseType,
    status: license.status as any,
    expireAt: license.expireAt?.toISOString() ?? null,
    leftSeconds,
    verifyToken,
  });
}

export async function heartbeatLicense(
  input: LicenseHeartbeatInput,
): Promise<LicenseHeartbeatResult> {
  const { prisma } = await import("telefunc").then((m) => m.getContext<{ prisma: PrismaClient }>());

  const product = await findProductByCode(prisma, input.productCode);
  if (!product) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.PRODUCT_NOT_FOUND, "产品不存在");
  }

  const license = await findLicenseById(prisma, input.licenseId);
  if (!license) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.KEY_NOT_FOUND, "Key 不存在");
  }

  const activation = await findActivation(prisma, product.id, license.id, input.deviceId);
  if (!activation) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.DEVICE_MISMATCH, "设备未激活");
  }

  const now = new Date();
  await updateActivation(prisma, activation.id, { lastSeenAt: now });

  return licenseSuccessResponse({
    ok: true,
    lastSeenAt: now.toISOString(),
  });
}

export async function deactivateLicense(
  input: LicenseDeactivateInput,
): Promise<LicenseDeactivateResult> {
  const { prisma } = await import("telefunc").then((m) => m.getContext<{ prisma: PrismaClient }>());

  const product = await findProductByCode(prisma, input.productCode);
  if (!product) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.PRODUCT_NOT_FOUND, "产品不存在");
  }

  const license = await findLicenseById(prisma, input.licenseId);
  if (!license) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.KEY_NOT_FOUND, "Key 不存在");
  }

  if (license.licenseType === "TRIAL") {
    return licenseErrorResponse(LICENSE_ERROR_CODES.TRIAL_NO_DEACTIVATE, "试用不支持解绑");
  }

  const activation = await findActivation(prisma, product.id, license.id, input.deviceId);
  if (!activation) {
    return licenseErrorResponse(LICENSE_ERROR_CODES.DEVICE_MISMATCH, "设备未激活");
  }

  await deactivateActivation(prisma, activation.id);
  await createRevocation(prisma, license.id, input.reason || "用户主动解绑");

  logger.info("license.deactivate", {
    licenseId: license.id,
    productCode: input.productCode,
    deviceId: input.deviceId,
    reason: input.reason,
  });

  return licenseSuccessResponse({
    ok: true,
    message: "解绑成功",
  });
}

export async function revokeLicenseKey(licenseId: number, reason?: string) {
  const { prisma } = await import("telefunc").then((m) => m.getContext<{ prisma: PrismaClient }>());

  const license = await findLicenseById(prisma, licenseId);
  if (!license) {
    throw notFoundError("Key 不存在", "KEY_NOT_FOUND");
  }

  await updateLicense(prisma, licenseId, { status: "REVOKED" });
  await createRevocation(prisma, licenseId, reason || "管理员手动吊销");

  logger.info("license.revoke", {
    licenseId,
    reason,
  });

  return { ok: true, message: "吊销成功" };
}

function generateKeySuffix(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
