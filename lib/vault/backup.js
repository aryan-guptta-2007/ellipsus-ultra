// Encrypted backup container. Everything in it is already ciphertext, so the
// file is safe to keep anywhere, and it opens only with the vault passphrase.
//
// Layout: 6-byte magic | uint32 LE manifest length | manifest JSON | file ciphertexts

import { FORMAT_VERSION } from "./crypto.js"

const MAGIC = "SVBK1\n"
const PREFIX_BYTES = MAGIC.length + 4

export class BackupFormatError extends Error {
    constructor(message) {
        super(message)
        this.name = "BackupFormatError"
    }
}

// `blobs` maps file id -> { iv, data: Blob }.
export function packBackup({ header, files, blobs, log, exportedAt = new Date().toISOString() }) {
    const manifest = {
        version: FORMAT_VERSION,
        exportedAt,
        header,
        log,
        files: files.map((file) => {
            const blob = blobs.get(file.id)
            if (!blob) throw new BackupFormatError(`Missing ciphertext for file ${file.id}`)
            return { ...file, dataIv: blob.iv, dataSize: blob.data.size }
        }),
    }

    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest))
    const prefix = new Uint8Array(PREFIX_BYTES)
    prefix.set(new TextEncoder().encode(MAGIC))
    new DataView(prefix.buffer).setUint32(MAGIC.length, manifestBytes.length, true)

    return new Blob(
        [prefix, manifestBytes, ...manifest.files.map((file) => blobs.get(file.id).data)],
        { type: "application/octet-stream" },
    )
}

function assertManifest(manifest) {
    const { header, files, log } = manifest ?? {}
    const valid =
        manifest?.version === FORMAT_VERSION &&
        typeof header?.wrappedKey === "string" &&
        typeof header?.salt === "string" &&
        Array.isArray(files) &&
        Array.isArray(log) &&
        files.every(
            (file) =>
                typeof file?.id === "string" &&
                typeof file?.dataIv === "string" &&
                Number.isSafeInteger(file?.dataSize) &&
                file.dataSize >= 0,
        )
    if (!valid) throw new BackupFormatError("This backup file is damaged or from an unsupported version")
}

export async function unpackBackup(source) {
    const notBackup = "This isn't a StealthVault backup file"
    if (source.size < PREFIX_BYTES) throw new BackupFormatError(notBackup)

    const prefix = new Uint8Array(await source.slice(0, PREFIX_BYTES).arrayBuffer())
    if (new TextDecoder().decode(prefix.subarray(0, MAGIC.length)) !== MAGIC) {
        throw new BackupFormatError(notBackup)
    }

    const manifestLength = new DataView(prefix.buffer).getUint32(MAGIC.length, true)
    const dataStart = PREFIX_BYTES + manifestLength
    if (dataStart > source.size) throw new BackupFormatError("This backup file is incomplete")

    let manifest
    try {
        manifest = JSON.parse(await source.slice(PREFIX_BYTES, dataStart).text())
    } catch {
        throw new BackupFormatError("This backup file is damaged or from an unsupported version")
    }
    assertManifest(manifest)

    const totalData = manifest.files.reduce((sum, file) => sum + file.dataSize, 0)
    if (dataStart + totalData !== source.size) throw new BackupFormatError("This backup file is incomplete")

    let offset = dataStart
    const blobs = manifest.files.map(({ id, dataIv, dataSize }) => {
        const data = source.slice(offset, offset + dataSize)
        offset += dataSize
        return { id, iv: dataIv, data }
    })
    const files = manifest.files.map(({ dataIv, dataSize, ...file }) => file)

    return { header: manifest.header, files, blobs, log: manifest.log, exportedAt: manifest.exportedAt }
}
