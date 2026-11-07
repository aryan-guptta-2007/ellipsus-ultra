// All cryptography for the vault. Uses only the Web Crypto API, so the same
// code runs in the browser and in `node --test`.
//
// Key hierarchy:
//   passphrase --PBKDF2-SHA256--> key-encryption key (never stored)
//   key-encryption key --AES-GCM wrap--> master key (stored only in wrapped form)
//   master key --AES-256-GCM--> every file, file name and activity entry
//
// Changing the passphrase only re-wraps the master key, so files are not
// re-encrypted. Each ciphertext is bound to its record through additional
// authenticated data, so records cannot be swapped without detection.

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const FORMAT_VERSION = 1
export const PBKDF2_ITERATIONS = 600_000
// Lowest count we accept from a stored header, so a tampered or corrupt header
// can't quietly weaken key derivation.
export const MIN_PBKDF2_ITERATIONS = 100_000
export const MIN_PASSPHRASE_LENGTH = 12

const SALT_BYTES = 16
const IV_BYTES = 12
const AES_GCM = { name: "AES-GCM", length: 256 }

export class WrongPassphraseError extends Error {
    constructor() {
        super("Wrong passphrase")
        this.name = "WrongPassphraseError"
    }
}

export class IntegrityError extends Error {
    constructor(message = "This data failed its integrity check") {
        super(message)
        this.name = "IntegrityError"
    }
}

export function randomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length))
}

export function randomId() {
    return Array.from(randomBytes(16), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function toBase64(bytes) {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    let binary = ""
    const chunk = 0x8000
    for (let i = 0; i < view.length; i += chunk) {
        binary += String.fromCharCode(...view.subarray(i, i + chunk))
    }
    return btoa(binary)
}

export function fromBase64(text) {
    const binary = atob(text)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

async function deriveWrappingKey(passphrase, salt, iterations) {
    const material = await crypto.subtle.importKey(
        "raw",
        encoder.encode(passphrase.normalize("NFKC")),
        "PBKDF2",
        false,
        ["deriveKey"],
    )
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations },
        material,
        AES_GCM,
        false,
        ["wrapKey", "unwrapKey"],
    )
}

// The KDF parameters are authenticated, so editing them breaks the unwrap.
function wrapContext(iterations, salt) {
    return encoder.encode(`stealthvault/v${FORMAT_VERSION}/master|${iterations}|${salt}`)
}

async function sealMasterKey(masterKey, passphrase) {
    const salt = randomBytes(SALT_BYTES)
    const iv = randomBytes(IV_BYTES)
    const iterations = PBKDF2_ITERATIONS
    const saltText = toBase64(salt)
    const wrappingKey = await deriveWrappingKey(passphrase, salt, iterations)
    const wrapped = await crypto.subtle.wrapKey("raw", masterKey, wrappingKey, {
        name: "AES-GCM",
        iv,
        additionalData: wrapContext(iterations, saltText),
    })
    return {
        wrappingKey,
        header: {
            version: FORMAT_VERSION,
            iterations,
            salt: saltText,
            wrapIv: toBase64(iv),
            wrappedKey: toBase64(wrapped),
        },
    }
}

function unwrapMasterKey(wrappingKey, header, extractable) {
    return crypto.subtle.unwrapKey(
        "raw",
        fromBase64(header.wrappedKey),
        wrappingKey,
        {
            name: "AES-GCM",
            iv: fromBase64(header.wrapIv),
            additionalData: wrapContext(header.iterations, header.salt),
        },
        AES_GCM,
        extractable,
        ["encrypt", "decrypt"],
    )
}

// Returns the header to store plus a non-extractable session key.
export async function createVaultKeys(passphrase) {
    const masterKey = await crypto.subtle.generateKey(AES_GCM, true, ["encrypt", "decrypt"])
    const { header, wrappingKey } = await sealMasterKey(masterKey, passphrase)
    return { header, key: await unwrapMasterKey(wrappingKey, header, false) }
}

export async function unlockVaultKey(passphrase, header, { extractable = false } = {}) {
    if (
        header?.version !== FORMAT_VERSION ||
        !Number.isInteger(header.iterations) ||
        header.iterations < MIN_PBKDF2_ITERATIONS
    ) {
        throw new IntegrityError("This vault header is not valid")
    }
    const wrappingKey = await deriveWrappingKey(passphrase, fromBase64(header.salt), header.iterations)
    try {
        return await unwrapMasterKey(wrappingKey, header, extractable)
    } catch {
        // AES-GCM can't tell a wrong key from a tampered header, and neither can we.
        throw new WrongPassphraseError()
    }
}

// Throws WrongPassphraseError if `currentPassphrase` is wrong.
export async function rewrapVaultKey(currentPassphrase, newPassphrase, header) {
    const masterKey = await unlockVaultKey(currentPassphrase, header, { extractable: true })
    const { header: nextHeader } = await sealMasterKey(masterKey, newPassphrase)
    return nextHeader
}

export async function encryptBytes(key, bytes, context) {
    const iv = randomBytes(IV_BYTES)
    const data = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: encoder.encode(context) },
        key,
        bytes,
    )
    return { iv: toBase64(iv), data }
}

export async function decryptBytes(key, { iv, data }, context) {
    try {
        return await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: fromBase64(iv), additionalData: encoder.encode(context) },
            key,
            data,
        )
    } catch {
        throw new IntegrityError()
    }
}

export async function encryptJson(key, value, context) {
    const { iv, data } = await encryptBytes(key, encoder.encode(JSON.stringify(value)), context)
    return { iv, data: toBase64(data) }
}

export async function decryptJson(key, { iv, data }, context) {
    const plain = await decryptBytes(key, { iv, data: fromBase64(data) }, context)
    return JSON.parse(decoder.decode(plain))
}

// Contexts tie each ciphertext to the record that holds it.
export const fileDataContext = (id) => `stealthvault/v${FORMAT_VERSION}/file/${id}/data`
export const fileMetaContext = (id) => `stealthvault/v${FORMAT_VERSION}/file/${id}/meta`
export const logContext = (id) => `stealthvault/v${FORMAT_VERSION}/log/${id}`

const COMMON_FRAGMENTS = [
    "password", "passphrase", "qwerty", "letmein", "welcome", "iloveyou", "admin",
    "abc123", "123456", "stealthvault",
]

// A rough estimate for guiding people, not a measure of real attack cost.
export function scorePassphrase(passphrase) {
    if (!passphrase) return { score: 0, label: "Too short", acceptable: false }

    const length = [...passphrase].length
    let pool = 0
    if (/[a-z]/.test(passphrase)) pool += 26
    if (/[A-Z]/.test(passphrase)) pool += 26
    if (/[0-9]/.test(passphrase)) pool += 10
    if (/[^a-zA-Z0-9]/.test(passphrase)) pool += 33

    // Counting distinct characters keeps "aaaaaaaaaaaa" from scoring on length.
    const distinct = new Set(passphrase).size
    const effectiveLength = Math.min(length, distinct * 2)
    let bits = effectiveLength * Math.log2(Math.max(pool, 2))

    const lower = passphrase.toLowerCase()
    if (COMMON_FRAGMENTS.some((fragment) => lower.includes(fragment))) bits *= 0.5

    if (length < MIN_PASSPHRASE_LENGTH) return { score: 0, label: "Too short", acceptable: false }
    if (bits < 45) return { score: 1, label: "Weak", acceptable: false }
    if (bits < 60) return { score: 2, label: "Fair", acceptable: true }
    if (bits < 80) return { score: 3, label: "Good", acceptable: true }
    return { score: 4, label: "Strong", acceptable: true }
}
