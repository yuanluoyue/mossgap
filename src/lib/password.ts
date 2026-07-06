/**
 * 密码哈希工具（基于 Web Crypto API 的 PBKDF2）。
 *
 * 兼容 Cloudflare Workers 与 Node.js 18+ 环境。
 * 哈希格式：`pbkdf2$<iterations>$<salt_b64>$<hash_b64>`
 */

const ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bit
const HASH_NAME = "SHA-256";

function getSubtle(): SubtleCrypto {
  return crypto.subtle;
}

function randomBytes(length: number): ArrayBuffer {
  const buf = new ArrayBuffer(length);
  crypto.getRandomValues(new Uint8Array(buf));
  return buf;
}

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buf;
}

/** 对明文密码进行 PBKDF2 哈希。 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const keyMaterial = await getSubtle().importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const hash = await getSubtle().deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: HASH_NAME,
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** 校验明文密码是否与哈希匹配。 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = fromBase64(parts[2]);
  const expected = new Uint8Array(fromBase64(parts[3]));
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const keyMaterial = await getSubtle().importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const hash = await getSubtle().deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: HASH_NAME,
    },
    keyMaterial,
    expected.length * 8,
  );
  const actual = new Uint8Array(hash);

  // 常量时间比较
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}
