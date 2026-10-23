// Password hashing for local-only accounts (PBKDF2-SHA256, random salt).
// In server mode passwords are hashed on the server instead.
const enc = new TextEncoder();
const toHex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');

export async function hashPassword(pw, salt) {
  if (!globalThis.crypto || !crypto.subtle) throw Object.assign(new Error('insecure'), {
    field: 'form', msg: 'Accounts need a secure connection. Open the app over https or on localhost.',
  });
  salt = salt || toHex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 150000 }, key, 256);
  return { salt, hash: toHex(bits) };
}

export const authError = (field, msg) => Object.assign(new Error(msg), { field, msg });
