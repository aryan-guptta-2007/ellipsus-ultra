// Serves the production build and runs each browser suite against it.
// Set E2E_BASE to test a server that's already running, such as `next dev`.
import { spawn, spawnSync } from "node:child_process"

const PORT = 3111
const SUITES = ["landing", "vault", "edge-cases"]
const external = process.env.E2E_BASE
const base = external ?? `http://localhost:${PORT}`

async function waitForServer() {
    for (let attempt = 0; attempt < 60; attempt++) {
        try {
            await fetch(base)
            return
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 500))
        }
    }
    throw new Error(`Nothing is responding at ${base}`)
}

const server = external
    ? null
    : spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { stdio: "ignore" })

let failed = false
try {
    await waitForServer()
    for (const suite of SUITES) {
        console.log(`\n=== ${suite} ===`)
        const { status } = spawnSync(process.execPath, [`tests/e2e/${suite}.e2e.mjs`], {
            stdio: "inherit",
            env: { ...process.env, E2E_BASE: base },
        })
        if (status !== 0) failed = true
    }
} finally {
    server?.kill()
}

console.log(failed ? "\nE2E: FAILED" : "\nE2E: all suites passed")
process.exit(failed ? 1 : 0)
