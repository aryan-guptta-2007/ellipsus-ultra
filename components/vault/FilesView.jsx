"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
    AlertTriangle, Archive, ChevronRight, Download, Eye, File as FileIcon, FileCode, FileImage,
    FileText, Loader2, Search, Trash2, Upload,
} from "lucide-react"
import { Button, Modal, formatBytes, formatDate, saveBlob } from "./ui"

const TEXT_PREVIEW_BYTES = 200 * 1024
const PREVIEW_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp"]
const ARCHIVE_PATTERN = /\.(zip|rar|7z|tar|gz|bz2|xz)$/i
const CODE_PATTERN = /\.(js|jsx|ts|tsx|py|java|c|cpp|cs|go|rs|rb|php|sh|html|css|json|xml|ya?ml|sql)$/i
const DOCUMENT_PATTERN = /\.(pdf|docx?|xlsx?|pptx?|odt|rtf|txt|md|csv)$/i

function categoryOf(file) {
    if (file.type?.startsWith("image/")) return "images"
    if (ARCHIVE_PATTERN.test(file.name)) return "archives"
    if (CODE_PATTERN.test(file.name)) return "code"
    if (file.type?.startsWith("text/") || DOCUMENT_PATTERN.test(file.name)) return "documents"
    return "other"
}

const CATEGORY_STYLES = {
    images: { icon: FileImage, tone: "bg-pink-500/10 text-pink-400 border-pink-500/10" },
    archives: { icon: Archive, tone: "bg-amber-500/10 text-amber-400 border-amber-500/10" },
    code: { icon: FileCode, tone: "bg-purple-500/10 text-purple-400 border-purple-500/10" },
    documents: { icon: FileText, tone: "bg-blue-500/10 text-blue-400 border-blue-500/10" },
    other: { icon: FileIcon, tone: "bg-slate-500/10 text-slate-300 border-slate-500/10" },
}

function previewKind(file) {
    if (PREVIEW_IMAGE_TYPES.includes(file.type)) return "image"
    if (file.type?.startsWith("text/") || file.type === "application/json") return "text"
    if (/\.(txt|md|csv|log|json)$/i.test(file.name)) return "text"
    return null
}

const SORTERS = {
    newest: (a, b) => b.createdAt - a.createdAt,
    oldest: (a, b) => a.createdAt - b.createdAt,
    name: (a, b) => a.name.localeCompare(b.name),
    largest: (a, b) => b.size - a.size,
}

const selectClass =
    "h-10 rounded-md bg-white/5 border border-white/10 px-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/60 [&>option]:bg-[#13151a]"

function PreviewModal({ preview, onClose }) {
    const [imageUrl, setImageUrl] = useState(null)

    // The URL lives exactly as long as this modal, which also unmounts if the
    // vault locks underneath it, so decrypted data never outlives the session.
    useEffect(() => {
        if (!preview.image) return
        const url = URL.createObjectURL(preview.image)
        setImageUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [preview.image])

    return (
        <Modal title={preview.file.name} onClose={onClose} wide>
            {preview.image ? (
                // A decrypted blob URL can't go through the next/image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                imageUrl && <img src={imageUrl} alt={preview.file.name} className="max-w-full max-h-[65vh] mx-auto rounded" />
            ) : (
                <>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words font-mono">{preview.text}</pre>
                    {preview.truncated && (
                        <p className="mt-4 text-xs text-gray-500">Showing the first 200 KB. Download the file to see all of it.</p>
                    )}
                </>
            )}
        </Modal>
    )
}

function FileRow({ file, broken, onPreview, onDownload, onDelete, busy }) {
    const category = categoryOf(file)
    const { icon: Icon, tone } = CATEGORY_STYLES[category]
    const failed = file.corrupt || broken

    return (
        <li className="bg-[#1a1c23]/40 hover:bg-[#1a1c23]/80 transition-colors border border-white/5 rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className={`p-2.5 rounded-lg border shrink-0 ${failed ? "bg-red-500/10 text-red-400 border-red-500/20" : tone}`}>
                {failed ? <AlertTriangle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-100 truncate" title={file.name}>{file.name}</p>
                <p className="mt-0.5 text-xs text-gray-500 truncate">
                    {failed ? (
                        <span className="text-red-300">Failed its integrity check</span>
                    ) : (
                        <>
                            <span className="hidden sm:inline">AES-256-GCM • </span>
                            {formatBytes(file.size)} • {formatDate(file.createdAt)}
                        </>
                    )}
                </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
                {previewKind(file) && !failed && (
                    <IconAction label={`Preview ${file.name}`} onClick={() => onPreview(file)} disabled={busy}>
                        <Eye className="w-4 h-4" />
                    </IconAction>
                )}
                {!file.corrupt && (
                    <IconAction label={`Download ${file.name}`} onClick={() => onDownload(file)} disabled={busy}>
                        <Download className="w-4 h-4" />
                    </IconAction>
                )}
                <IconAction label={`Delete ${file.name}`} onClick={() => onDelete(file)} disabled={busy} danger>
                    <Trash2 className="w-4 h-4" />
                </IconAction>
            </div>
        </li>
    )
}

function IconAction({ label, danger, ...props }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={`w-9 h-9 flex items-center justify-center rounded-md text-gray-500 transition-colors disabled:opacity-40 ${danger ? "hover:text-red-400 hover:bg-red-500/10" : "hover:text-white hover:bg-white/5"}`}
            {...props}
        />
    )
}

export default function FilesView({ vault, notify }) {
    const { files, integrity } = vault
    const inputRef = useRef(null)
    const [query, setQuery] = useState("")
    const [category, setCategory] = useState("all")
    const [sort, setSort] = useState("newest")
    const [uploads, setUploads] = useState(null) // { done, total, name }
    const [dragging, setDragging] = useState(false)
    const [busy, setBusy] = useState(false)
    const [preview, setPreview] = useState(null)
    const [pendingDelete, setPendingDelete] = useState(null)

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase()
        return files
            .filter((file) => (category === "all" || categoryOf(file) === category) && file.name.toLowerCase().includes(needle))
            .sort(SORTERS[sort])
    }, [files, query, category, sort])

    const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files])
    const failedIds = useMemo(() => new Set(integrity?.failed ?? []), [integrity])

    const upload = async (fileList) => {
        const queue = [...fileList]
        if (!queue.length || uploads) return
        let added = 0
        const problems = []
        for (const [index, file] of queue.entries()) {
            setUploads({ done: index, total: queue.length, name: file.name })
            try {
                await vault.addFile(file)
                added += 1
            } catch (error) {
                problems.push(`${file.name}: ${error.message}`)
            }
        }
        setUploads(null)
        if (added) notify(`Encrypted ${added} ${added === 1 ? "file" : "files"}.`)
        if (problems.length) notify(problems.join(" "), "error")
    }

    useEffect(() => {
        const hasFiles = (event) => event.dataTransfer?.types?.includes("Files")
        const onDragOver = (event) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            setDragging(true)
        }
        const onDragLeave = (event) => {
            if (event.relatedTarget === null) setDragging(false)
        }
        const onDrop = (event) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            setDragging(false)
            upload(event.dataTransfer.files)
        }
        window.addEventListener("dragover", onDragOver)
        window.addEventListener("dragleave", onDragLeave)
        window.addEventListener("drop", onDrop)
        return () => {
            window.removeEventListener("dragover", onDragOver)
            window.removeEventListener("dragleave", onDragLeave)
            window.removeEventListener("drop", onDrop)
        }
    })

    const download = async (file) => {
        setBusy(true)
        try {
            const plain = await vault.readFile(file, "file.downloaded")
            saveBlob(new Blob([plain], { type: "application/octet-stream" }), file.name)
        } catch (error) {
            notify(error.message, "error")
        } finally {
            setBusy(false)
        }
    }

    const openPreview = async (file) => {
        setBusy(true)
        try {
            const plain = await vault.readFile(file, "file.previewed")
            if (previewKind(file) === "image") {
                setPreview({ file, image: new Blob([plain], { type: file.type }) })
            } else {
                setPreview({
                    file,
                    text: new TextDecoder().decode(plain.slice(0, TEXT_PREVIEW_BYTES)),
                    truncated: plain.byteLength > TEXT_PREVIEW_BYTES,
                })
            }
        } catch (error) {
            notify(error.message, "error")
        } finally {
            setBusy(false)
        }
    }

    const closePreview = useCallback(() => setPreview(null), [])

    const confirmDelete = async () => {
        const file = pendingDelete
        setPendingDelete(null)
        try {
            await vault.removeFile(file)
            notify(`Deleted ${file.name}.`)
        } catch (error) {
            notify(error.message, "error")
        }
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap justify-between items-end gap-4 border-b border-white/5 pb-5">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Main Vault</h1>
                    <p className="text-xs mt-1 flex items-center gap-1.5 font-medium">
                        <span className="text-white">{files.length}</span>
                        <span className="text-white/50">protected {files.length === 1 ? "file" : "files"}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-emerald-500/50 mx-0.5" />
                        <span className="text-white">{formatBytes(totalSize)}</span>
                        <span className="text-white/50">used</span>
                    </p>
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    aria-label="Choose files to encrypt"
                    onChange={(event) => {
                        upload(event.target.files)
                        event.target.value = ""
                    }}
                />
                <Button variant="primary" disabled={Boolean(uploads)} onClick={() => inputRef.current?.click()}>
                    {uploads ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Securely
                    <ChevronRight className="w-3 h-3" />
                </Button>
            </div>

            {uploads && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3" role="status">
                    <p className="text-xs text-emerald-200 truncate">
                        Encrypting {uploads.name} ({uploads.done + 1} of {uploads.total})
                    </p>
                    <div className="mt-2 h-1 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(uploads.done / uploads.total) * 100}%` }} />
                    </div>
                </div>
            )}

            {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search files"
                            aria-label="Search files"
                            className="w-full h-10 rounded-md bg-white/5 border border-white/10 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/60"
                        />
                    </div>
                    <select aria-label="Filter by type" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
                        <option value="all">All types</option>
                        <option value="documents">Documents</option>
                        <option value="images">Images</option>
                        <option value="code">Code</option>
                        <option value="archives">Archives</option>
                        <option value="other">Other</option>
                    </select>
                    <select aria-label="Sort files" value={sort} onChange={(event) => setSort(event.target.value)} className={selectClass}>
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="name">Name</option>
                        <option value="largest">Largest</option>
                    </select>
                </div>
            )}

            {files.length === 0 ? (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="rounded-xl border border-dashed border-white/10 hover:border-emerald-500/40 transition-colors py-16 px-6 text-center"
                >
                    <Upload className="w-6 h-6 text-gray-500 mx-auto mb-3" />
                    <span className="block text-sm font-medium text-gray-200">Drop files here, or click to choose</span>
                    <span className="block mt-1 text-xs text-gray-500">Files are encrypted in this browser before they're stored. Up to 256 MB each.</span>
                </button>
            ) : visible.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">No files match your search.</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {visible.map((file) => (
                        <FileRow
                            key={file.id}
                            file={file}
                            broken={failedIds.has(file.id)}
                            busy={busy}
                            onPreview={openPreview}
                            onDownload={download}
                            onDelete={setPendingDelete}
                        />
                    ))}
                </ul>
            )}

            {dragging && (
                <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0b0c10]/90 pointer-events-none">
                    <div className="rounded-2xl border-2 border-dashed border-emerald-500/50 px-12 py-10 text-center">
                        <Upload className="w-7 h-7 text-emerald-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-white">Drop to encrypt</p>
                    </div>
                </div>
            )}

            {preview && <PreviewModal preview={preview} onClose={closePreview} />}

            {pendingDelete && (
                <Modal title="Delete this file?" onClose={() => setPendingDelete(null)}>
                    <p className="text-sm text-gray-300 break-words">
                        <span className="font-semibold text-white">{pendingDelete.name}</span> will be permanently deleted from this vault.
                    </p>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete}>Delete file</Button>
                    </div>
                </Modal>
            )}
        </div>
    )
}
