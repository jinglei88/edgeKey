import type { Hono } from "hono";
import { getPrismaForD1 } from "../prisma-factory";
import {
  activateLicense,
  deactivateLicense,
  heartbeatLicense,
  verifyLicense,
} from "../../modules/license/service";
import { buildCanonicalString, buildVerifyCanonicalString, isTimestampValid, verifyHmacSha256 } from "../../modules/license/crypto";
import { LICENSE_ERROR_CODES } from "../../modules/license/types";

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "";
}

function jsonError(code: number, message: string) {
  return { code, data: null, message };
}

export function registerLicenseRoutes(app: Hono) {
  app.post("/api/license/activate", async (c) => {
    const database = (c.env as { DB?: D1Database } | undefined)?.DB;
    if (!database) {
      return c.json(jsonError(LICENSE_ERROR_CODES.PRODUCT_NOT_FOUND, "数据库未初始化"));
    }

    const prisma = getPrismaForD1(database);
    const body = await c.req.json();

    const { productCode, key, deviceId, platform, domain, fingerprint, appVersion, timestamp, nonce, signature } = body;

    if (!productCode || !key || !deviceId || !platform || !fingerprint || !timestamp || !nonce || !signature) {
      return c.json(jsonError(LICENSE_ERROR_CODES.INVALID_PARAMS, "参数不完整"));
    }

    if (!isTimestampValid(timestamp)) {
      return c.json(jsonError(LICENSE_ERROR_CODES.REQUEST_EXPIRED, "请求已过期"));
    }

    const canonical = buildCanonicalString(productCode, key, deviceId, timestamp, nonce);
    const secret = getAuthSecret();
    if (!secret) {
      return c.json(jsonError(LICENSE_ERROR_CODES.SIGNATURE_INVALID, "服务端签名未配置"));
    }

    const isValid = await verifyHmacSha256(secret, canonical, signature);
    if (!isValid) {
      return c.json(jsonError(LICENSE_ERROR_CODES.SIGNATURE_INVALID, "签名验证失败"));
    }

    const result = await activateLicense({
      productCode,
      key,
      deviceId,
      platform,
      domain,
      fingerprint,
      appVersion,
      timestamp,
      nonce,
      signature,
    });

    return c.json(result);
  });

  app.post("/api/license/verify", async (c) => {
    const database = (c.env as { DB?: D1Database } | undefined)?.DB;
    if (!database) {
      return c.json(jsonError(LICENSE_ERROR_CODES.PRODUCT_NOT_FOUND, "数据库未初始化"));
    }

    const prisma = getPrismaForD1(database);
    const body = await c.req.json();

    const { productCode, licenseId, deviceId, fingerprint, timestamp, nonce, signature } = body;

    if (!productCode || !licenseId || !deviceId || !fingerprint || !timestamp || !nonce || !signature) {
      return c.json(jsonError(LICENSE_ERROR_CODES.INVALID_PARAMS, "参数不完整"));
    }

    if (!isTimestampValid(timestamp)) {
      return c.json(jsonError(LICENSE_ERROR_CODES.REQUEST_EXPIRED, "请求已过期"));
    }

    const canonical = buildVerifyCanonicalString(productCode, licenseId, deviceId, timestamp, nonce);
    const secret = getAuthSecret();
    if (!secret) {
      return c.json(jsonError(LICENSE_ERROR_CODES.SIGNATURE_INVALID, "服务端签名未配置"));
    }

    const isValid = await verifyHmacSha256(secret, canonical, signature);
    if (!isValid) {
      return c.json(jsonError(LICENSE_ERROR_CODES.SIGNATURE_INVALID, "签名验证失败"));
    }

    const result = await verifyLicense({
      productCode,
      licenseId,
      deviceId,
      fingerprint,
      timestamp,
      nonce,
      signature,
    });

    return c.json(result);
  });

  app.post("/api/license/heartbeat", async (c) => {
    const database = (c.env as { DB?: D1Database } | undefined)?.DB;
    if (!database) {
      return c.json(jsonError(LICENSE_ERROR_CODES.PRODUCT_NOT_FOUND, "数据库未初始化"));
    }

    const prisma = getPrismaForD1(database);
    const body = await c.req.json();

    const { productCode, licenseId, deviceId, timestamp, nonce, signature } = body;

    if (!productCode || !licenseId || !deviceId || !timestamp || !nonce || !signature) {
      return c.json(jsonError(LICENSE_ERROR_CODES.INVALID_PARAMS, "参数不完整"));
    }

    if (!isTimestampValid(timestamp)) {
      return c.json(jsonError(LICENSE_ERROR_CODES.REQUEST_EXPIRED, "请求已过期"));
    }

    const canonical = buildVerifyCanonicalString(productCode, licenseId, deviceId, timestamp, nonce);
    const secret = getAuthSecret();
    if (!secret) {
      return c.json(jsonError(LICENSE_ERROR_CODES.SIGNATURE_INVALID, "服务端签名未配置"));
    }

    const isValid = await verifyHmacSha256(secret, canonical, signature);
    if (!isValid) {
      return c.json(jsonError(LICENSE_ERROR_CODES.SIGNATURE_INVALID, "签名验证失败"));
    }

    const result = await heartbeatLicense({
      productCode,
      licenseId,
      deviceId,
      timestamp,
      nonce,
      signature,
    });

    return c.json(result);
  });

  app.post("/api/license/deactivate", async (c) => {
    const database = (c.env as { DB?: D1Database } | undefined)?.DB;
    if (!database) {
      return c.json(jsonError(LICENSE_ERROR_CODES.PRODUCT_NOT_FOUND, "数据库未初始化"));
    }

    const prisma = getPrismaForD1(database);
    const body = await c.req.json();

    const { productCode, licenseId, deviceId, reason, timestamp, nonce, signature } = body;

    if (!productCode || !licenseId || !deviceId || !timestamp || !nonce || !signature) {
      return c.json(jsonError(LICENSE_ERROR_CODES.INVALID_PARAMS, "参数不完整"));
    }

    if (!isTimestampValid(timestamp)) {
      return c.json(jsonError(LICENSE_ERROR_CODES.REQUEST_EXPIRED, "请求已过期"));
    }

    const canonical = buildVerifyCanonicalString(productCode, licenseId, deviceId, timestamp, nonce);
    const secret = getAuthSecret();
    if (!secret) {
      return c.json(jsonError(LICENSE_ERROR_CODES.SIGNATURE_INVALID, "服务端签名未配置"));
    }

    const isValid = await verifyHmacSha256(secret, canonical, signature);
    if (!isValid) {
      return c.json(jsonError(LICENSE_ERROR_CODES.SIGNATURE_INVALID, "签名验证失败"));
    }

    const result = await deactivateLicense({
      productCode,
      licenseId,
      deviceId,
      reason,
      timestamp,
      nonce,
      signature,
    });

    return c.json(result);
  });
}
