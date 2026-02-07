import { createHash, randomBytes } from "crypto";

const PREFIX_INV = "agnxi_inv";
const PREFIX_KEY = "agnxi_key";

export function generateExternalId(): string {
  const bytes = randomBytes(16);
  const hex = bytes.toString("hex");
  return `${PREFIX_INV}_${hex}`;
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const bytes = randomBytes(32);
  const raw = `${PREFIX_KEY}_${bytes.toString("hex")}`;
  const prefix = raw.slice(0, 12);
  const hash = hashApiKey(raw);
  return { raw, prefix, hash };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function apiKeyPrefix(key: string): string {
  return key.slice(0, 12);
}
