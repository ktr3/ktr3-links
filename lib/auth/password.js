import {
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const HASH_VERSION = "scrypt-v1";
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 256) {
    throw new Error("Admin passwords must contain between 12 and 256 characters");
  }

  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `${HASH_VERSION}$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyPassword(password, encodedHash) {
  try {
    const [version, saltEncoded, keyEncoded, extra] = String(encodedHash || "").split("$");
    if (version !== HASH_VERSION || !saltEncoded || !keyEncoded || extra !== undefined) return false;

    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(keyEncoded, "base64url");
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;

    const actual = Buffer.from(await scryptAsync(String(password || ""), salt, expected.length));
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
