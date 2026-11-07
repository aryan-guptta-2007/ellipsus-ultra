// The whole vault lifecycle, in a real browser.
import fs from "node:fs"
import path from "node:path"
import { chromium } from "playwright"
import {
    BASE, FIXTURES, OTHER_PASSPHRASE, OUT, PASSPHRASE, PIXEL_PNG,
    check, collectProblems, createVault, finish, passphraseField, reload, unlock,
} from "./harness.mjs"

const fixture = (name) => path.join(FIXTURES, name)
const UNICODE_NAME = "weird name — ünï (1).txt"
const SECRET = "TOP-SECRET-MARKER-" + "x".repeat(50)

fs.writeFileSync(fixture("secret-notes.txt"), SECRET)
fs.writeFileSync(fixture("empty.txt"), "")
fs.writeFileSync(fixture("pixel.png"), PIXEL_PNG)
fs.writeFileSync(fixture("archive.zip"), Buffer.from(Array.from({ length: 3 * 1024 * 1024 }, (_, i) => (i * 31 + (i >> 8)) & 255)))
fs.writeFileSync(fixture(UNICODE_NAME), "unicode name")
fs.writeFileSync(fixture("junk.svault"), "this is not a backup at all, sorry")

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await context.newPage()

const problems = []
const offsite = []
const writes = []
collectProblems(page, problems)
page.on("request", (request) => {
    const url = new URL(request.url())
    if (!["localhost", "127.0.0.1"].includes(url.hostname) && !["blob:", "data:"].includes(url.protocol)) offsite.push(request.url())
    if (request.method() !== "GET") writes.push(`${request.method()} ${request.url()}`)
})

const fileRows = (target = page) => target.locator("main li")
const toast = (text) => page.getByText(text).first().waitFor({ timeout: 15000 })
const rejected = (target = page) => target.getByRole("alert").filter({ hasText: "didn't work" }).waitFor({ timeout: 15000 })
const sideNav = (name) => page.getByRole("navigation", { name: "Vault" }).first().getByRole("link", { name })

const dumpDatabase = () =>
    page.evaluate(async () => {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open("stealthvault")
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
        const all = (store) =>
            new Promise((resolve) => {
                const request = db.transaction(store).objectStore(store).getAll()
                request.onsuccess = () => resolve(request.result)
            })
        const dump = { meta: await all("meta"), files: await all("files"), log: await all("log"), blobs: [] }
        for (const blob of await all("blobs")) dump.blobs.push({ id: blob.id, text: await blob.data.text() })
        db.close()
        return dump
    })

// --- creating a vault
await page.goto(`${BASE}/vault`)
await page.getByRole("heading", { name: "Create your vault" }).waitFor()
check("a fresh browser offers to create a vault", true)
await page.screenshot({ path: path.join(OUT, "vault-create.png") })

const createButton = page.getByRole("button", { name: "Create Vault" })
await passphraseField(page).fill("short")
check("a weak passphrase can't create a vault", await createButton.isDisabled())
await passphraseField(page).fill(PASSPHRASE)
await page.getByLabel("Confirm passphrase", { exact: true }).fill(PASSPHRASE + "x")
await page.getByRole("checkbox").check()
check("mismatched passphrases can't create a vault", await createButton.isDisabled())
await page.getByLabel("Confirm passphrase", { exact: true }).fill(PASSPHRASE)
check("a valid form enables Create", await createButton.isEnabled())
await createButton.click()
await page.getByRole("heading", { name: "Main Vault" }).waitFor({ timeout: 20000 })
check("the vault is created and opened", true)

// --- adding files
await page.getByLabel("Choose files to encrypt").setInputFiles(
    ["secret-notes.txt", "empty.txt", "pixel.png", "archive.zip", UNICODE_NAME].map(fixture),
)
await toast("Encrypted 5 files.")
check("five files are added", (await fileRows().count()) === 5)
await page.screenshot({ path: path.join(OUT, "vault-files.png") })

// --- nothing readable at rest
const atRest = JSON.stringify(await dumpDatabase())
check("file contents are not readable at rest", !atRest.includes("TOP-SECRET-MARKER"))
check("file names are not readable at rest", !["secret-notes", "pixel.png", "archive.zip"].some((name) => atRest.includes(name)))
check("the passphrase is not stored", !atRest.includes(PASSPHRASE))
check("the activity log is encrypted at rest", !atRest.includes("file.added"))
check(
    "nothing is kept in web storage",
    (await page.evaluate(() => Object.keys(localStorage).length + Object.keys(sessionStorage).length)) === 0,
)

// --- reading files back
for (const name of ["secret-notes.txt", "archive.zip", "empty.txt", UNICODE_NAME]) {
    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: `Download ${name}` }).click(),
    ])
    const identical = fs.readFileSync(await download.path()).equals(fs.readFileSync(fixture(name)))
    check(`download is byte-identical: ${name}`, identical && download.suggestedFilename() === name)
}

await page.getByRole("button", { name: "Preview secret-notes.txt" }).click()
await page.getByRole("dialog").getByText("TOP-SECRET-MARKER").waitFor()
check("text preview shows the decrypted text", true)
await page.keyboard.press("Escape")

await page.getByRole("button", { name: "Preview pixel.png" }).click()
const image = page.getByRole("dialog").locator("img")
await image.waitFor()
const width = await image.evaluate(
    (img) => new Promise((resolve) => (img.complete ? resolve(img.naturalWidth) : (img.onload = () => resolve(img.naturalWidth)))),
)
check("image preview renders under the content security policy", width === 1)
await page.keyboard.press("Escape")

// --- finding files
await page.getByLabel("Search files").fill("secret")
check("search filters the list", (await fileRows().count()) === 1)
await page.getByLabel("Search files").fill("zzzz")
await page.getByText("No files match your search.").waitFor()
await page.getByLabel("Search files").fill("")
await page.getByLabel("Filter by type").selectOption("images")
check("the type filter works", (await fileRows().count()) === 1)
await page.getByLabel("Filter by type").selectOption("all")
await page.getByLabel("Sort files").selectOption("largest")
check("sorting by size works", (await fileRows().first().innerText()).includes("archive.zip"))
await page.getByLabel("Sort files").selectOption("newest")

// --- deleting and dropping files
await page.getByRole("button", { name: "Delete empty.txt" }).click()
await page.getByRole("button", { name: "Cancel" }).click()
check("cancelling a delete keeps the file", (await fileRows().count()) === 5)
await page.getByRole("button", { name: "Delete empty.txt" }).click()
await page.getByRole("button", { name: "Delete file" }).click()
await toast("Deleted empty.txt.")
check("confirming a delete removes the file", (await fileRows().count()) === 4)

await page.evaluate(() => {
    const data = new DataTransfer()
    data.items.add(new File(["dropped!"], "dropped.txt", { type: "text/plain" }))
    window.dispatchEvent(new DragEvent("dragover", { dataTransfer: data, bubbles: true, cancelable: true }))
    window.dispatchEvent(new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true }))
})
await toast("Encrypted 1 file.")
check("drag and drop encrypts a file", (await fileRows().count()) === 5)

// --- activity
await sideNav("Activity").click()
await page.getByRole("heading", { name: "Activity", exact: true }).waitFor()
check(
    "the activity log records real events",
    (await page.getByText("File Deleted").count()) >= 1 && (await page.getByText("Vault Created").count()) >= 1,
)

// --- locking
await reload(page, "/vault#keys")
await page.getByRole("heading", { name: "Unlock your vault" }).waitFor()
check("reloading the page locks the vault", true)
await passphraseField(page).fill("nope nope nope nope")
await page.getByRole("button", { name: "Unlock" }).click()
await rejected()
check("a wrong passphrase is rejected", true)
await unlock(page, PASSPHRASE, "Keys")
check("unlocking honours a deep link", true)
check("a failed attempt is reported after unlocking", (await page.locator("aside").innerText()).includes("Failed Unlock Attempts"))

// --- integrity
await page.getByRole("button", { name: "Verify all files" }).click()
await page.getByText("5 of 5 verified").first().waitFor({ timeout: 20000 })
check("verification passes on an untouched vault", true)

await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
        const request = indexedDB.open("stealthvault")
        request.onsuccess = () => resolve(request.result)
    })
    const blobs = await new Promise((resolve) => {
        const request = db.transaction("blobs").objectStore("blobs").getAll()
        request.onsuccess = () => resolve(request.result)
    })
    const target = blobs.find((blob) => blob.data.size > 1_000_000)
    const bytes = new Uint8Array(await target.data.arrayBuffer())
    bytes[500] ^= 0xff
    await new Promise((resolve) => {
        const tx = db.transaction("blobs", "readwrite")
        tx.objectStore("blobs").put({ ...target, data: new Blob([bytes]) })
        tx.oncomplete = resolve
    })
    db.close()
})
await page.getByRole("button", { name: "Verify all files" }).click()
await page.getByText("1 of 5 failed").first().waitFor({ timeout: 20000 })
check("one flipped byte is caught by verification", true)

await reload(page, "/vault#files")
await unlock(page, PASSPHRASE)
await page.getByRole("button", { name: "Download archive.zip" }).click()
await page.getByRole("alert").filter({ hasText: "failed its integrity check" }).waitFor({ timeout: 15000 })
check("a tampered file refuses to open", true)
await page.getByRole("button", { name: "Delete archive.zip" }).click()
await page.getByRole("button", { name: "Delete file" }).click()
await toast("Deleted archive.zip.")

// --- changing the passphrase
await reload(page, "/vault#keys")
await unlock(page, PASSPHRASE, "Keys")
await page.getByLabel("Current passphrase", { exact: true }).fill("wrong wrong wrong wrong")
await page.getByLabel("New passphrase", { exact: true }).fill(OTHER_PASSPHRASE)
await page.getByLabel("Confirm new passphrase", { exact: true }).fill(OTHER_PASSPHRASE)
await page.getByRole("button", { name: "Change passphrase" }).click()
await page.getByText("Your current passphrase is incorrect.").waitFor({ timeout: 15000 })
check("changing the passphrase requires the current one", true)
await page.getByLabel("Current passphrase", { exact: true }).fill(PASSPHRASE)
await page.getByRole("button", { name: "Change passphrase" }).click()
await toast("Passphrase changed.")
await page.getByRole("button", { name: "Lock", exact: true }).click()
await page.getByRole("heading", { name: "Unlock your vault" }).waitFor()
check("the Lock button locks", true)
await passphraseField(page).fill(PASSPHRASE)
await page.getByRole("button", { name: "Unlock" }).click()
await rejected()
check("the old passphrase stops working", true)
await unlock(page, OTHER_PASSPHRASE, "Keys")
check("the new passphrase works", true)

// --- backup and restore into an unrelated browser profile
await sideNav("Settings").click()
await page.getByRole("heading", { name: "Settings", exact: true }).waitFor()
const [backup] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export encrypted backup" }).click(),
])
const backupPath = path.join(OUT, "test.svault")
await backup.saveAs(backupPath)
const backupBytes = fs.readFileSync(backupPath)
const today = new Date().toLocaleDateString("en-CA")
check("the backup is named with today's local date", backup.suggestedFilename() === `stealthvault-backup-${today}.svault`, backup.suggestedFilename())
check("the backup contains no plaintext", !backupBytes.includes("TOP-SECRET-MARKER") && !backupBytes.includes("secret-notes"))

const freshContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const fresh = await freshContext.newPage()
await fresh.goto(`${BASE}/vault`)
await fresh.getByRole("heading", { name: "Create your vault" }).waitFor()
await fresh.getByLabel("Backup file").setInputFiles(fixture("junk.svault"))
await fresh.getByRole("alert").filter({ hasText: "isn't a StealthVault backup" }).waitFor({ timeout: 10000 })
check("a file that isn't a backup is rejected", true)
await fresh.getByLabel("Backup file").setInputFiles(backupPath)
await fresh.getByRole("heading", { name: "Unlock your vault" }).waitFor({ timeout: 15000 })
await unlock(fresh, OTHER_PASSPHRASE)
check("the backup restores in a fresh browser", (await fileRows(fresh).count()) === 4)
const [restored] = await Promise.all([
    fresh.waitForEvent("download"),
    fresh.getByRole("button", { name: "Download secret-notes.txt" }).click(),
])
check("a restored file is byte-identical", fs.readFileSync(await restored.path()).equals(fs.readFileSync(fixture("secret-notes.txt"))))
await reload(fresh, "/vault#activity")
await unlock(fresh, OTHER_PASSPHRASE, "Activity")
await fresh.getByText("Backup Restored").first().waitFor({ timeout: 10000 })
check("the restore is recorded in the activity log", true)
await freshContext.close()

// --- two tabs
const secondTab = await context.newPage()
await secondTab.goto(`${BASE}/vault`)
await unlock(secondTab, OTHER_PASSPHRASE)
await reload(page, "/vault")
await unlock(page, OTHER_PASSPHRASE)
await page.getByLabel("Choose files to encrypt").setInputFiles({ name: "from-tab-a.txt", mimeType: "text/plain", buffer: Buffer.from("hi") })
await secondTab.getByText("from-tab-a.txt", { exact: true }).waitFor({ timeout: 8000 })
check("a second open tab sees new files", true)
await secondTab.close()

// --- auto-lock, on a fake clock
const clockContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const clockPage = await clockContext.newPage()
await clockPage.clock.install()
await createVault(clockPage)
await clockPage.clock.fastForward("04:00")
await clockPage.waitForTimeout(300)
check("the vault stays open before the idle limit", await clockPage.getByRole("heading", { name: "Main Vault" }).isVisible())
await clockPage.clock.fastForward("01:30")
await clockPage.getByRole("heading", { name: "Unlock your vault" }).waitFor({ timeout: 8000 })
check("the vault auto-locks after 5 idle minutes", true)
await clockContext.close()

// --- settings and deletion
await reload(page, "/vault#settings")
await unlock(page, OTHER_PASSPHRASE, "Settings")
await page.getByLabel("Auto-lock after").selectOption("15")
await page.waitForTimeout(300)
await reload(page, "/vault#settings")
await unlock(page, OTHER_PASSPHRASE, "Settings")
check("the auto-lock setting persists", (await page.getByLabel("Auto-lock after").inputValue()) === "15")
await page.getByRole("button", { name: "Delete vault" }).click()
const deleteButton = page.getByRole("button", { name: "Delete everything" })
check("deleting the vault requires typing DELETE", await deleteButton.isDisabled())
await page.getByLabel("Type DELETE to confirm").fill("DELETE")
await deleteButton.click()
await page.getByRole("heading", { name: "Create your vault" }).waitFor()
const wiped = await dumpDatabase()
check("deleting the vault wipes every store", [wiped.meta, wiped.files, wiped.blobs, wiped.log].every((store) => store.length === 0))

// --- across the whole run
check("no request ever left this origin", offsite.length === 0, offsite.slice(0, 3).join(" "))
check("no data was ever sent to the server", writes.length === 0, writes.slice(0, 3).join(" "))
check("no console errors or warnings", problems.length === 0, problems.slice(0, 5).join(" | "))

await browser.close()
finish()
