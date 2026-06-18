import { assertAdminAccess } from "../../../modules/auth/service";
import { revokeLicenseKey } from "../../../modules/license/service";

export async function onRevokeLicenseKey(input: {
  licenseId: number;
  reason?: string;
}) {
  assertAdminAccess();
  return revokeLicenseKey(input.licenseId, input.reason);
}
