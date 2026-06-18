import { assertAdminAccess } from "../../../modules/auth/service";
import { createLicenseProduct, listLicenseProducts, updateLicenseProduct } from "../../../modules/license/service";

export async function onListLicenseProducts() {
  assertAdminAccess();
  return listLicenseProducts();
}

export async function onSaveLicenseProduct(input: {
  id?: number;
  code: string;
  name: string;
  description?: string;
}) {
  assertAdminAccess();

  if (input.id) {
    return updateLicenseProduct(input.id, {
      name: input.name,
      description: input.description,
    });
  }

  return createLicenseProduct({
    code: input.code,
    name: input.name,
    description: input.description,
  });
}

export async function onToggleLicenseProduct(input: { id: number; status: string }) {
  assertAdminAccess();
  return updateLicenseProduct(input.id, { status: input.status as any });
}
