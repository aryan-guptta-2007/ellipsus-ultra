# StealthVault

An encrypted file vault that runs entirely in your browser. Files are encrypted on your device with a passphrase only you know. There are no accounts and no uploads, and the server only ever delivers the page.

It has two parts:

- `/` is the marketing site.
- `/vault` is the working app: create a vault, add files, then preview, download, verify, back up and restore them.

## Getting started

You need Node.js 20.9 or later.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For a production build:

```bash
npm run build
npm start
```

## Tests

```bash
npm test            # unit tests for the crypto and backup code
npm run test:e2e    # builds the app, then runs every browser suite against it
```

The browser suites need Chromium, which you can install once with `npx playwright install chromium`. Results and screenshots go to `test-results/`.

To run them against a dev server instead, which also surfaces hydration warnings, start `npm run dev` and run:

```bash
E2E_BASE=http://localhost:3000 node tests/e2e/run.mjs
```

## How the vault protects files

```
passphrase ──PBKDF2-SHA-256, 600,000 iterations──▶ wrapping key (never stored)
wrapping key ──AES-GCM──▶ master key (stored only in wrapped form)
master key ──AES-256-GCM──▶ each file, its metadata, and each activity entry
```

- **Encryption:** every record has its own random IV. File names, types, sizes and the activity log are encrypted as well as file contents.
- **Tamper detection:** each ciphertext is bound to its record through additional authenticated data, so changing one byte or swapping two records fails decryption.
- **While unlocked:** the master key is a non-extractable `CryptoKey` held in memory. It's released on lock, on auto-lock and on page reload.
- **Changing the passphrase:** only the wrapped master key changes, so files aren't re-encrypted.
- **Network isolation:** a Content Security Policy in `next.config.mjs` blocks fetches, scripts and images from other origins.

## Limitations

- **There's no recovery.** A forgotten passphrase means the files are gone. That's what makes the encryption meaningful.
- **Data lives in one browser.** Clearing site data erases the vault, so export backups from Settings. Vaults don't sync between devices.
- **Old backups keep their old passphrase.** A backup made before a passphrase change still opens with the passphrase from that time, because the master key doesn't change. If a passphrase is compromised, create a new vault rather than only changing it.
- **Files are limited to 256 MB each.** Web Crypto encrypts in one pass, so a file has to fit in memory.
- **Deleted data may linger on disk.** Only ciphertext is ever written, but the browser controls when storage space is actually reclaimed.
- **Local attackers aren't fully covered.** Malware on the device can read files while the vault is unlocked. The failed-unlock counter is stored in plain form, so someone with direct access to the browser profile could reset it, and there's no rate limit on offline guessing. JavaScript also can't guarantee that memory is wiped on lock.
- **PBKDF2 rather than Argon2.** Web Crypto has no memory-hard KDF, so a long passphrase matters. The app rejects weak ones.
- **The security headers need a server.** `next start` and Vercel apply them. A static export wouldn't, so you'd have to set them in your hosting configuration.
- **This hasn't had an independent security audit.** Don't rely on it for high-stakes data until it has.

## Project structure

```
app/                  routes: landing page, /vault, 404
components/           landing page sections
components/vault/     the vault app (useVault.js holds its state and actions)
lib/vault/crypto.js   all cryptography
lib/vault/store.js    IndexedDB persistence (ciphertext only)
lib/vault/backup.js   the encrypted .svault backup format
tests/                unit tests
tests/e2e/            browser tests
```

Built with Next.js 16, React 19, Tailwind CSS 3, GSAP and Lenis. The vault itself uses only browser APIs.
