/**
 * cryptoService.ts
 * -----------------
 * Zero-knowledge kripto sloj. SVE se izvršava u browseru (Web Crypto API).
 * Server nikada ne vidi master password, niti dešifrovane tajne, niti privatni ključ.
 *
 * Tok:
 *  - Registracija: iz master passworda se PBKDF2-om izvodi "master key".
 *    Generiše se RSA par. Privatni ključ se enkriptuje master key-em ("wrap")
 *    i tek tada šalje serveru kao blob. Javni ključ ide serveru u čistom obliku.
 *  - Kreiranje tajne: generiše se nasumičan AES ključ, njime se enkriptuje sadržaj,
 *    a sam AES ključ se enkriptuje RSA javnim ključem vlasnika (hybrid enkripcija).
 *  - Čitanje: master key (iz lozinke) -> unwrap privatnog ključa -> RSA dekripcija
 *    AES ključa -> AES dekripcija sadržaja.
 *  - Sharing A->B: A dešifruje AES ključ svojim privatnim ključem, pa ga
 *    re-enkriptuje JAVNIM ključem korisnika B. Server samo prenosi blob.
 *
 * Ne piše se sopstvena kripto implementacija — koristi se ugrađeni Web Crypto API.
 */

const subtle = window.crypto.subtle;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const PBKDF2_ITERATIONS = 250000;
const PBKDF2_HASH = "SHA-256";
const RSA_MODULUS_LENGTH = 2048;

/** Blob koji nastaje AES-GCM enkripcijom: IV + šifrovani podaci, oba base64. */
export interface EncryptedBlob {
  iv: string;
  data: string;
}

// ---------- base64 helperi ----------

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ---------- KDF: master password -> master key ----------

/** Generiše nasumičan salt (base64). Čuva se uz korisnika na serveru. */
export function generateSalt(): string {
  return bufferToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
}

/**
 * Izvodi AES-GCM master ključ iz master passworda i salta (PBKDF2).
 * Ovaj ključ nikada ne napušta browser i ne čuva se nigde trajno.
 */
export async function deriveMasterKey(
  masterPassword: string,
  saltBase64: string,
): Promise<CryptoKey> {
  const salt = base64ToBuffer(saltBase64);
  const baseKey = await subtle.importKey(
    "raw",
    textEncoder.encode(masterPassword).buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ---------- AES-GCM enkripcija/dekripcija ----------

async function aesEncrypt(
  key: CryptoKey,
  plaintext: string,
): Promise<EncryptedBlob> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    textEncoder.encode(plaintext).buffer as ArrayBuffer,
  );
  return { iv: bufferToBase64(iv), data: bufferToBase64(ciphertext) };
}

async function aesDecrypt(
  key: CryptoKey,
  blob: EncryptedBlob,
): Promise<string> {
  const iv = base64ToBuffer(blob.iv);
  const plaintext = await subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToBuffer(blob.data),
  );
  return textDecoder.decode(plaintext);
}

// ---------- RSA par i wrap/unwrap privatnog ključa ----------

/** Generiše RSA-OAEP par. Vraća javni (spki) i privatni (pkcs8) ključ kao base64. */
export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const keyPair = await subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: RSA_MODULUS_LENGTH,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: PBKDF2_HASH,
    },
    true,
    ["encrypt", "decrypt"],
  );
  const publicKey = bufferToBase64(
    await subtle.exportKey("spki", keyPair.publicKey),
  );
  const privateKey = bufferToBase64(
    await subtle.exportKey("pkcs8", keyPair.privateKey),
  );
  return { publicKey, privateKey };
}

/**
 * Enkriptuje (wrap) privatni ključ master ključem.
 * Rezultat (JSON string) je ono što se šalje serveru kao encryptedPrivateKey.
 */
export async function wrapPrivateKey(
  privateKeyBase64: string,
  masterKey: CryptoKey,
): Promise<string> {
  const blob = await aesEncrypt(masterKey, privateKeyBase64);
  return JSON.stringify(blob);
}

/** Dekriptuje (unwrap) privatni ključ master ključem. Baca grešku ako lozinka nije ispravna. */
export async function unwrapPrivateKey(
  wrappedPrivateKey: string,
  masterKey: CryptoKey,
): Promise<CryptoKey> {
  const blob: EncryptedBlob = JSON.parse(wrappedPrivateKey);
  const privateKeyBase64 = await aesDecrypt(masterKey, blob);
  return subtle.importKey(
    "pkcs8",
    base64ToBuffer(privateKeyBase64),
    { name: "RSA-OAEP", hash: PBKDF2_HASH },
    false,
    ["decrypt"],
  );
}

async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  return subtle.importKey(
    "spki",
    base64ToBuffer(publicKeyBase64),
    { name: "RSA-OAEP", hash: PBKDF2_HASH },
    false,
    ["encrypt"],
  );
}

// ---------- Enkripcija tajni (hybrid: AES sadržaj + RSA ključ) ----------

/** Sve što je potrebno da se tajna sačuva na serveru u nečitljivom obliku. */
export interface EncryptedSecretPayload {
  encryptedData: string; // JSON: { iv, data } — AES-GCM šifrovan sadržaj tajne
  encryptedKey: string; // RSA-OAEP šifrovan AES ključ (za vlasnika)
}

/**
 * Enkriptuje sadržaj tajne za vlasnika.
 * @param plaintext  npr. JSON.stringify({ password, notes })
 * @param ownerPublicKeyBase64  javni ključ vlasnika
 */
export async function encryptSecret(
  plaintext: string,
  ownerPublicKeyBase64: string,
): Promise<EncryptedSecretPayload> {
  // nasumičan per-secret AES ključ
  const aesKeyRaw = window.crypto.getRandomValues(new Uint8Array(32));
  const aesKeyRawBuffer = aesKeyRaw.buffer as ArrayBuffer;
  const aesKey = await subtle.importKey(
    "raw",
    aesKeyRawBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const encrypted = await aesEncrypt(aesKey, plaintext);

  // AES ključ enkriptujemo RSA javnim ključem vlasnika
  const ownerPublicKey = await importPublicKey(ownerPublicKeyBase64);
  const encryptedKeyBuffer = await subtle.encrypt(
    { name: "RSA-OAEP" },
    ownerPublicKey,
    aesKeyRawBuffer,
  );

  return {
    encryptedData: JSON.stringify(encrypted),
    encryptedKey: bufferToBase64(encryptedKeyBuffer),
  };
}

/**
 * Dešifruje tajnu. Vraća izvorni plaintext (npr. JSON sa password/notes).
 * @param encryptedData  JSON { iv, data }
 * @param encryptedKey   RSA-šifrovan AES ključ (za ovog korisnika)
 * @param privateKey     unwrap-ovan privatni ključ korisnika
 */
export async function decryptSecret(
  encryptedData: string,
  encryptedKey: string,
  privateKey: CryptoKey,
): Promise<string> {
  // RSA dekripcija AES ključa
  const aesKeyRaw = await subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBuffer(encryptedKey),
  );
  const aesKey = await subtle.importKey(
    "raw",
    aesKeyRaw,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const blob: EncryptedBlob = JSON.parse(encryptedData);
  return aesDecrypt(aesKey, blob);
}

/**
 * Sharing A->B. A dešifruje AES ključ svojim privatnim ključem, pa ga
 * re-enkriptuje JAVNIM ključem korisnika B. Vraća novi encryptedKey za B.
 * @param encryptedKeyForMe  RSA-šifrovan AES ključ (za korisnika A)
 * @param myPrivateKey       unwrap-ovan privatni ključ korisnika A
 * @param recipientPublicKeyBase64  javni ključ korisnika B
 */
export async function reEncryptKeyForRecipient(
  encryptedKeyForMe: string,
  myPrivateKey: CryptoKey,
  recipientPublicKeyBase64: string,
): Promise<string> {
  // dešifruj AES ključ svojim privatnim ključem
  const aesKeyRaw = await subtle.decrypt(
    { name: "RSA-OAEP" },
    myPrivateKey,
    base64ToBuffer(encryptedKeyForMe),
  );
  // re-enkriptuj javnim ključem primaoca
  const recipientPublicKey = await importPublicKey(recipientPublicKeyBase64);
  const reEncrypted = await subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    aesKeyRaw,
  );
  return bufferToBase64(reEncrypted);
}
