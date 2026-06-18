import { assertAdminAccess } from "../../../modules/auth/service";
import { listLicenseKeys } from "../../../modules/license/service";

export async function onQueryLicenseKeys(filters?: {
  productCode?: string;
  licenseType?: string;
  status?: string;
}) {
  assertAdminAccess();
  return listLicenseKeys(filters);
}
