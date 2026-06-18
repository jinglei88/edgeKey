import { assertAdminAccess } from "../../../modules/auth/service";
import { generateLicenseKeys } from "../../../modules/license/service";
import type { LicenseType } from "../../../modules/license/types";

export async function onGenerateLicenseKeys(input: {
  productCode: string;
  licenseType: LicenseType;
  count: number;
  prefix?: string;
  maxDevices?: number;
}) {
  assertAdminAccess();
  return generateLicenseKeys(input);
}
