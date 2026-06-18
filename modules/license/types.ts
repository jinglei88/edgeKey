import type { LicenseProduct, License, LicenseActivation } from "../../generated/prisma/client";

export type LicenseType = "TRIAL" | "DAY" | "MONTH" | "YEAR" | "PERMANENT";

export type LicenseStatus = "ACTIVE" | "EXPIRED" | "SUSPENDED" | "REVOKED";

export type LicenseActivationStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface LicenseProductInput {
  code: string;
  name: string;
  description?: string;
}

export interface LicenseGenerateInput {
  productCode: string;
  licenseType: LicenseType;
  count: number;
  prefix?: string;
  maxDevices?: number;
  metadata?: Record<string, unknown>;
}

export interface LicenseActivateInput {
  productCode: string;
  key: string;
  deviceId: string;
  platform: "windows" | "android";
  domain?: string;
  fingerprint: string;
  appVersion?: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface LicenseVerifyInput {
  productCode: string;
  licenseId: number;
  deviceId: string;
  fingerprint: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface LicenseHeartbeatInput {
  productCode: string;
  licenseId: number;
  deviceId: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface LicenseDeactivateInput {
  productCode: string;
  licenseId: number;
  deviceId: string;
  reason?: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface LicenseActivateResult {
  code: number;
  data: {
    licenseId: number;
    productCode: string;
    licenseType: LicenseType;
    status: LicenseStatus;
    activatedAt: string;
    expireAt: string | null;
    leftSeconds: number | null;
    verifyToken: string;
  } | null;
  message: string;
}

export interface LicenseVerifyResult {
  code: number;
  data: {
    valid: boolean;
    productCode: string;
    licenseType: LicenseType;
    status: LicenseStatus;
    expireAt: string | null;
    leftSeconds: number | null;
    verifyToken: string;
  } | null;
  message: string;
}

export interface LicenseHeartbeatResult {
  code: number;
  data: {
    ok: boolean;
    lastSeenAt: string;
  } | null;
  message: string;
}

export interface LicenseDeactivateResult {
  code: number;
  data: {
    ok: boolean;
    message: string;
  } | null;
  message: string;
}

export interface LicenseKeyInfo {
  id: number;
  key: string;
  productCode: string;
  productName: string;
  licenseType: LicenseType;
  durationSec: number;
  maxDevices: number;
  status: LicenseStatus;
  activatedAt: string | null;
  expireAt: string | null;
  createdAt: string;
}

export interface LicenseProductInfo {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export const DURATION_SECONDS: Record<LicenseType, number> = {
  TRIAL: 600,        // 10 minutes
  DAY: 86400,        // 24 hours
  MONTH: 2592000,    // 30 days
  YEAR: 31536000,    // 365 days
  PERMANENT: 0,      // no expiration
};

export const LICENSE_ERROR_CODES = {
  KEY_NOT_FOUND: 1001,
  KEY_EXPIRED: 1002,
  DEVICE_MISMATCH: 1003,
  TRIAL_EXHAUSTED: 1004,
  SIGNATURE_INVALID: 1005,
  REQUEST_EXPIRED: 1006,
  INVALID_PARAMS: 1007,
  TRIAL_NO_DEACTIVATE: 1008,
  PRODUCT_NOT_FOUND: 1009,
  KEY_PRODUCT_MISMATCH: 1010,
} as const;
