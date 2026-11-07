// Size limits, large files, offline use, locking during a preview, mobile layout.
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { chromium } from "playwright"
import { BASE, OUT, PASSPHRASE, PIXEL_PNG, check, collectProblems, createVault, finish, unlock } from "./harness.mjs"

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true })
const page = await context.newPage()
const problems = []
collectProblems(page, problems)
await createVault(page)

const dropRandomFile = (name, megabytes) =>
    page.evaluate(
        ({ name, megabytes }) => {
            const bytes = new Uint8Array(megabytes * 1024 * 1024)
            for (let offset = 0; offset < bytes.length; offset += 65536) {
                crypto.getRandomValues(bytes.subarray(offset, offset + 65536))
            }
            window.__digest = crypto.subtle
                .digest("SHA-256", bytes)
                .then((hash) => [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join(""))
            const data = new DataTransfer()
            data.items.add(new File([bytes], name, { type: "application/octet-stream" }))
            window.dispatchEvent(new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true }))
        },
        { name, megabytes },
    )

// --- size limit
await dropRandomFile("too-big.bin", 257)
await page.getByRole("alert").filter({ hasText: "Files can be up to 256 MB" }).waitFor({ timeout: 30000 })
check("a file over 256 MB is refused with a message", (await page.locator("main li").count()) === 0)

// --- a large file, compared by hash
await dropRandomFile("big-video.mp4", 200)
await page.getByText("Encrypted 1 file.").waitFor({ timeout: 120000 })
check("a 200 MB file encrypts", (await page.locator("main li").count()) === 1)
const expected = await page.evaluate(() => window.__digest)
const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120000 }),
    page.getByRole("button", { name: "Download big-video.mp4" }).click(),
])
const actual = crypto.createHash("sha256").update(fs.readFileSync(await download.path())).digest("hex")
check("a 200 MB file decrypts to identical bytes", actual === expected)
await page.getByRole("button", { name: "Delete big-video.mp4" }).click()
await page.getByRole("button", { name: "Delete file" }).click()
await page.getByText("Deleted big-video.mp4.").waitFor()

// --- offline
await context.setOffline(true)
await page.getByLabel("Choose files to encrypt").setInputFiles({ name: "offline.txt", mimeType: "text/plain", buffer: Buffer.from("written offline") })
await page.getByRole("button", { name: "Preview offline.txt" }).waitFor({ timeout: 8000 })
const [offlineDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download offline.txt" }).click(),
])
check("encrypting and decrypting work offline", fs.readFileSync(await offlineDownload.path()).toString() === "written offline")
await page.getByRole("button", { name: "Lock", exact: true }).click()
await unlock(page, PASSPHRASE)
check("locking and unlocking work offline", true)
await context.setOffline(false)

// --- a preview open at lock time must not leave decrypted data reachable.
// fetch() is blocked by the content security policy either way, so this loads
// an image, which the policy allows, to get a result that can actually differ.
const canLoad = (url) =>
    new Promise((resolve) => {
        const image = new Image()
        image.onload = () => resolve(true)
        image.onerror = () => resolve(false)
        image.src = url
    })
await page.getByLabel("Choose files to encrypt").setInputFiles({ name: "id.png", mimeType: "image/png", buffer: PIXEL_PNG })
await page.getByRole("button", { name: "Preview id.png" }).click()
const previewImage = page.getByRole("dialog").locator("img")
await previewImage.waitFor()
const previewUrl = await previewImage.getAttribute("src")
check("a preview is readable while open", await page.evaluate(canLoad, previewUrl))
await page.evaluate(() => [...document.querySelectorAll("button")].find((button) => button.innerText.trim() === "Lock").click())
await page.getByRole("heading", { name: "Unlock your vault" }).waitFor()
await page.waitForTimeout(200)
check("a preview is unreachable once the vault locks", !(await page.evaluate(canLoad, previewUrl)))

// --- keyboard
await unlock(page, PASSPHRASE)
await page.getByRole("button", { name: "Delete id.png" }).focus()
await page.keyboard.press("Enter")
await page.getByRole("dialog").waitFor()
await page.keyboard.press("Escape")
await page.waitForTimeout(100)
check(
    "Escape closes a dialog and returns focus",
    (await page.evaluate(() => document.activeElement.getAttribute("aria-label"))) === "Delete id.png",
)

// --- unknown routes
const missing = await page.goto(`${BASE}/no-such-page`)
check("unknown routes show the 404 page", missing.status() === 404 && (await page.getByText("This page stayed invisible.").isVisible()))

// --- mobile
const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const mobile = await mobileContext.newPage()
collectProblems(mobile, problems)
await createVault(mobile)
await mobile.getByLabel("Choose files to encrypt").setInputFiles([
    { name: "a-really-long-file-name-that-goes-on-and-on-and-on-for-a-while.pdf", mimeType: "application/pdf", buffer: Buffer.from("x") },
    { name: "photo.png", mimeType: "image/png", buffer: PIXEL_PNG },
])
await mobile.getByText("Encrypted 2 files.").waitFor()
await mobile.screenshot({ path: path.join(OUT, "vault-mobile.png") })
const overflowing = await mobile.evaluate(() => {
    const width = document.documentElement.clientWidth
    return [...document.querySelectorAll("body *")].filter((element) => {
        const rect = element.getBoundingClientRect()
        return rect.width && rect.right > width + 1 && !element.closest("svg")
    }).length
})
check("the vault doesn't overflow on mobile", overflowing === 0)
await mobile.getByRole("navigation", { name: "Vault" }).last().getByRole("link", { name: "Settings" }).tap()
await mobile.getByRole("heading", { name: "Settings", exact: true }).waitFor()
check("the mobile tab bar navigates", true)
await mobileContext.close()

// The 404 page and the revoked-preview probe both log an expected network error.
const unexpected = problems.filter((problem) => !problem.includes("404") && !problem.includes("ERR_FILE_NOT_FOUND"))
check("no unexpected console errors", unexpected.length === 0, unexpected.slice(0, 4).join(" | "))

await browser.close()
finish()
