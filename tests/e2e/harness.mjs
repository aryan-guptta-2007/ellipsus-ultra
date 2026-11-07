import fs from "node:fs"
import path from "node:path"

export const BASE = process.env.E2E_BASE ?? "http://localhost:3111"
export const OUT = path.resolve("test-results")
export const FIXTURES = path.join(OUT, "fixtures")
export const PASSPHRASE = "correct horse battery staple"
export const OTHER_PASSPHRASE = "an entirely different passphrase!"
export const PIXEL_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
)

fs.mkdirSync(FIXTURES, { recursive: true })

const results = []

export function check(name, ok, detail = "") {
    results.push({ name, ok })
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== "" ? `  -> ${detail}` : ""}`)
}

export function finish() {
    const failed = results.filter((result) => !result.ok)
    console.log(`\n${results.length - failed.length}/${results.length} passed\n`)
    if (failed.length) process.exitCode = 1
}

export function collectProblems(page, problems) {
    page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) problems.push(`${message.type()}: ${message.text().slice(0, 300)}`)
    })
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message.slice(0, 300)}`))
}

export const passphraseField = (page) => page.getByLabel("Passphrase", { exact: true })

export async function createVault(page, passphrase = PASSPHRASE) {
    await page.goto(`${BASE}/vault`)
    await passphraseField(page).fill(passphrase)
    await page.getByLabel("Confirm passphrase", { exact: true }).fill(passphrase)
    await page.getByRole("checkbox").check()
    await page.getByRole("button", { name: "Create Vault" }).click()
    await page.getByRole("heading", { name: "Main Vault" }).waitFor({ timeout: 20000 })
}

export async function unlock(page, passphrase, heading = "Main Vault") {
    await passphraseField(page).fill(passphrase)
    await page.getByRole("button", { name: "Unlock" }).click()
    await page.getByRole("heading", { name: heading, exact: true }).waitFor({ timeout: 20000 })
}

// Going through about:blank forces a real load, even when only the hash differs.
export async function reload(page, url) {
    await page.goto("about:blank")
    await page.goto(`${BASE}${url}`)
}
