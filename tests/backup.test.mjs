import { test } from "node:test"
import assert from "node:assert/strict"
import { BackupFormatError, packBackup, unpackBackup } from "../lib/vault/backup.js"

const header = { version: 1, iterations: 600000, salt: "c2FsdA==", wrapIv: "aXY=", wrappedKey: "a2V5" }

function sample() {
    const files = [
        { id: "a", createdAt: 1, meta: { iv: "x", data: "y" } },
        { id: "b", createdAt: 2, meta: { iv: "x", data: "z" } },
        { id: "empty", createdAt: 3, meta: { iv: "x", data: "w" } },
    ]
    const blobs = new Map([
        ["a", { id: "a", iv: "iv-a", data: new Blob([new Uint8Array([1, 2, 3])]) }],
        ["b", { id: "b", iv: "iv-b", data: new Blob([new Uint8Array([4, 5])]) }],
        ["empty", { id: "empty", iv: "iv-e", data: new Blob([]) }],
    ])
    return { header, files, blobs, log: [{ id: "l1", at: 1 }] }
}

test("a backup round-trips every record and ciphertext", async () => {
    const input = sample()
    const restored = await unpackBackup(packBackup(input))

    assert.deepEqual(restored.header, header)
    assert.deepEqual(restored.files, input.files)
    assert.deepEqual(restored.log, input.log)
    assert.deepEqual(restored.blobs.map((blob) => [blob.id, blob.iv]), [["a", "iv-a"], ["b", "iv-b"], ["empty", "iv-e"]])
    assert.deepEqual([...new Uint8Array(await restored.blobs[0].data.arrayBuffer())], [1, 2, 3])
    assert.deepEqual([...new Uint8Array(await restored.blobs[1].data.arrayBuffer())], [4, 5])
    assert.equal(restored.blobs[2].data.size, 0)
})

test("an empty vault can be backed up", async () => {
    const restored = await unpackBackup(packBackup({ header, files: [], blobs: new Map(), log: [] }))
    assert.deepEqual(restored.files, [])
})

test("files that aren't backups are rejected", async () => {
    await assert.rejects(unpackBackup(new Blob(["hello"])), BackupFormatError)
    await assert.rejects(unpackBackup(new Blob(["this is definitely not a backup"])), BackupFormatError)
})

test("a truncated backup is rejected", async () => {
    const backup = packBackup(sample())
    await assert.rejects(unpackBackup(backup.slice(0, backup.size - 1)), /incomplete/)
    await assert.rejects(unpackBackup(backup.slice(0, 20)), /incomplete/)
})

test("a backup with extra trailing data is rejected", async () => {
    await assert.rejects(unpackBackup(new Blob([packBackup(sample()), new Uint8Array([9])])), /incomplete/)
})

test("a backup with a corrupt manifest is rejected", async () => {
    const bytes = new Uint8Array(await packBackup(sample()).arrayBuffer())
    bytes[12] = 0x00
    await assert.rejects(unpackBackup(new Blob([bytes])), BackupFormatError)
})

test("packing fails rather than silently dropping a file", () => {
    const input = sample()
    input.blobs.delete("a")
    assert.throws(() => packBackup(input), BackupFormatError)
})
