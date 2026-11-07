import { test } from "node:test"
import assert from "node:assert/strict"
import {
    MIN_PBKDF2_ITERATIONS,
    IntegrityError,
    WrongPassphraseError,
    createVaultKeys,
    decryptBytes,
    decryptJson,
    encryptBytes,
    encryptJson,
    fileDataContext,
    fromBase64,
    rewrapVaultKey,
    scorePassphrase,
    toBase64,
    unlockVaultKey,
} from "../lib/vault/crypto.js"

const PASSPHRASE = "correct horse battery staple"
const bytes = (text) => new TextEncoder().encode(text)
const text = (buffer) => new TextDecoder().decode(buffer)

test("a vault opens with its passphrase and decrypts what it encrypted", async () => {
    const { header, key } = await createVaultKeys(PASSPHRASE)
    const sealed = await encryptBytes(key, bytes("secret"), "ctx")

    const reopened = await unlockVaultKey(PASSPHRASE, header)
    assert.equal(text(await decryptBytes(reopened, sealed, "ctx")), "secret")
})

test("a wrong passphrase is rejected", async () => {
    const { header } = await createVaultKeys(PASSPHRASE)
    await assert.rejects(unlockVaultKey("not the right passphrase", header), WrongPassphraseError)
})

test("the session key cannot be exported", async () => {
    const { header, key } = await createVaultKeys(PASSPHRASE)
    assert.equal(key.extractable, false)
    assert.equal((await unlockVaultKey(PASSPHRASE, header)).extractable, false)
    await assert.rejects(crypto.subtle.exportKey("raw", key))
})

test("the stored header contains neither the passphrase nor a raw key", async () => {
    const { header } = await createVaultKeys(PASSPHRASE)
    assert.ok(!JSON.stringify(header).includes(PASSPHRASE))
    assert.equal(fromBase64(header.wrappedKey).length, 32 + 16) // key plus GCM tag
})

test("two vaults with the same passphrase share no salt or wrapped key", async () => {
    const [a, b] = await Promise.all([createVaultKeys(PASSPHRASE), createVaultKeys(PASSPHRASE)])
    assert.notEqual(a.header.salt, b.header.salt)
    assert.notEqual(a.header.wrappedKey, b.header.wrappedKey)
})

test("changing the passphrase keeps existing files readable", async () => {
    const { header, key } = await createVaultKeys(PASSPHRASE)
    const sealed = await encryptBytes(key, bytes("kept"), "ctx")

    const next = await rewrapVaultKey(PASSPHRASE, "a brand new passphrase!", header)

    await assert.rejects(unlockVaultKey(PASSPHRASE, next), WrongPassphraseError)
    const reopened = await unlockVaultKey("a brand new passphrase!", next)
    assert.equal(text(await decryptBytes(reopened, sealed, "ctx")), "kept")
})

test("changing the passphrase requires the current one", async () => {
    const { header } = await createVaultKeys(PASSPHRASE)
    await assert.rejects(rewrapVaultKey("wrong passphrase!!", "a brand new passphrase!", header), WrongPassphraseError)
})

test("a tampered ciphertext fails its integrity check", async () => {
    const { key } = await createVaultKeys(PASSPHRASE)
    const sealed = await encryptBytes(key, bytes("original"), "ctx")
    const flipped = new Uint8Array(sealed.data.slice(0))
    flipped[0] ^= 1
    await assert.rejects(decryptBytes(key, { ...sealed, data: flipped }, "ctx"), IntegrityError)
})

test("a ciphertext cannot be moved onto another record", async () => {
    const { key } = await createVaultKeys(PASSPHRASE)
    const sealed = await encryptBytes(key, bytes("file a"), fileDataContext("a"))
    await assert.rejects(decryptBytes(key, sealed, fileDataContext("b")), IntegrityError)
})

test("encrypting the same bytes twice gives different ciphertext", async () => {
    const { key } = await createVaultKeys(PASSPHRASE)
    const [a, b] = await Promise.all([encryptBytes(key, bytes("same"), "ctx"), encryptBytes(key, bytes("same"), "ctx")])
    assert.notEqual(a.iv, b.iv)
    assert.notEqual(toBase64(a.data), toBase64(b.data))
})

test("metadata round-trips and hides file names", async () => {
    const { key } = await createVaultKeys(PASSPHRASE)
    const meta = { name: "tax-return.pdf", size: 12 }
    const sealed = await encryptJson(key, meta, "ctx")
    assert.ok(!atob(sealed.data).includes("tax-return"))
    assert.deepEqual(await decryptJson(key, sealed, "ctx"), meta)
})

test("empty and binary files survive a round trip", async () => {
    const { key } = await createVaultKeys(PASSPHRASE)
    const binary = Uint8Array.from({ length: 256 }, (_, i) => i)
    for (const input of [new Uint8Array(0), binary]) {
        const sealed = await encryptBytes(key, input, "ctx")
        assert.deepEqual(new Uint8Array(await decryptBytes(key, sealed, "ctx")), input)
    }
})

test("base64 helpers handle data larger than one conversion chunk", () => {
    const large = Uint8Array.from({ length: 100_000 }, (_, i) => i % 251)
    assert.deepEqual(fromBase64(toBase64(large)), large)
})

test("headers with weakened or edited KDF parameters are refused", async () => {
    const { header } = await createVaultKeys(PASSPHRASE)
    await assert.rejects(unlockVaultKey(PASSPHRASE, { ...header, iterations: 1 }), IntegrityError)
    await assert.rejects(
        unlockVaultKey(PASSPHRASE, { ...header, iterations: MIN_PBKDF2_ITERATIONS }),
        WrongPassphraseError,
    )
    await assert.rejects(unlockVaultKey(PASSPHRASE, { ...header, version: 99 }), IntegrityError)
})

test("Unicode passphrases match across normalisation forms", async () => {
    const { header } = await createVaultKeys("café au lait pour tous")
    await assert.doesNotReject(unlockVaultKey("café au lait pour tous", header))
})

test("passphrase scoring rejects weak choices and accepts long ones", () => {
    const acceptable = (value) => scorePassphrase(value).acceptable
    assert.equal(acceptable(""), false)
    assert.equal(acceptable("short"), false)
    assert.equal(acceptable("aaaaaaaaaaaaaaaa"), false)
    assert.equal(acceptable("password123456"), false)
    assert.equal(acceptable("111111111111"), false)
    assert.equal(acceptable(PASSPHRASE), true)
    assert.equal(acceptable("Tr0ub4dor&3-vault-key"), true)
})
