/**
 * AES-256-GCM helper — 빌링키 등 민감 토큰 양방향 암호화
 *
 * 환경변수 BILLING_KEY_ENCRYPTION_KEY (base64, 32바이트) 필수.
 * 로컬: openssl rand -base64 32 으로 생성 → .env.local
 * Vercel: vercel env add BILLING_KEY_ENCRYPTION_KEY (Production + Preview)
 *
 * 저장 형식 (bytea): [12B IV][16B AuthTag][N B Ciphertext]
 */
import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const k = process.env.BILLING_KEY_ENCRYPTION_KEY;
  if (!k) throw new Error("BILLING_KEY_ENCRYPTION_KEY missing");
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) {
    throw new Error("BILLING_KEY_ENCRYPTION_KEY must be 32 bytes (base64)");
  }
  return buf;
}

export function encrypt(plain: string): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv) as CipherGCM;
  const ct = Buffer.concat([cipher.update(plain, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

export function decrypt(blob: Buffer): string {
  if (blob.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("encrypted blob too short");
  }
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, getKey(), iv) as DecipherGCM;
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf-8");
}
