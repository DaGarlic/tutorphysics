// Mirrors tools/crypto.py: PBKDF2-SHA256 -> AES-256-GCM, blob = 12-byte nonce || ciphertext+tag.
const NONCE_LEN = 12;

function fromB64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function deriveKey(passphrase, saltB64, iterations) {
  const raw = new TextEncoder().encode(passphrase.normalize("NFC"));
  const base = await crypto.subtle.importKey("raw", raw, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: fromB64(saltB64), iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

export async function decryptBytes(key, bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.length < NONCE_LEN + 16) throw new Error("blob too short");
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: u8.slice(0, NONCE_LEN) },
    key,
    u8.slice(NONCE_LEN),
  );
}

export class UnlockError extends Error {}

export async function unlock(passphrase, load) {
  if (!passphrase || !passphrase.trim()) throw new UnlockError("Enter the password.");
  const meta = JSON.parse(new TextDecoder().decode(await load("meta.json")));
  const key = await deriveKey(passphrase, meta.salt, meta.iterations);
  let plain;
  try {
    plain = await decryptBytes(key, await load("index.enc"));
  } catch {
    throw new UnlockError("The site could not be unlocked. Refresh the page (Ctrl+Shift+R, or Cmd+Shift+R on a Mac) and log in again.");
  }
  return { key, index: JSON.parse(new TextDecoder().decode(plain)) };
}

export async function fetchBytes(name) {
  const r = await fetch(name, { cache: "no-cache" });
  if (!r.ok) throw new Error(`failed to load ${name}`);
  return r.arrayBuffer();
}
