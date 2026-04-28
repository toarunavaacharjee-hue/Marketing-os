import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(): Buffer {
  const secret = (process.env.WORKSPACE_AI_KEY_ENCRYPTION_SECRET || "").trim();
  if (!secret) {
    throw new Error("Missing WORKSPACE_AI_KEY_ENCRYPTION_SECRET");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

/** Returns base64(iv || tag || ciphertext) */
export function encryptWorkspaceSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptWorkspaceSecret(payload: string): string {
  const key = deriveKey();
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Invalid ciphertext");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
