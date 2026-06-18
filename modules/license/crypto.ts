const SIGNATURE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function buildCanonicalString(
  productCode: string,
  key: string,
  deviceId: string,
  timestamp: number,
  nonce: string,
): string {
  return `${productCode}|${key}|${deviceId}|${timestamp}|${nonce}`;
}

export function buildVerifyCanonicalString(
  productCode: string,
  licenseId: number,
  deviceId: string,
  timestamp: number,
  nonce: string,
): string {
  return `${productCode}|${licenseId}|${deviceId}|${timestamp}|${nonce}`;
}

export async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyHmacSha256(
  secret: string,
  message: string,
  expectedSignature: string,
): Promise<boolean> {
  const computed = await computeHmacSha256(secret, message);
  return computed === expectedSignature.toLowerCase();
}

export function isTimestampValid(timestamp: number): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= SIGNATURE_WINDOW_MS;
}

export function generateVerifyToken(licenseId: number, productCode: string, deviceId: string): Promise<string> {
  const payload = `${licenseId}:${productCode}:${deviceId}:${Date.now()}`;
  return computeHmacSha256("verify-token", payload);
}
