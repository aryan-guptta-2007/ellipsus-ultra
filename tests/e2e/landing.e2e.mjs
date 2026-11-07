// Landing page behaviour, links, layout at each width, and reduced motion.
import path from "node:path"
import { chromium } from "playwright"
import { BASE, OUT, check, collectProblems, finish } from "./harness.mjs"

const SCREENSHOTS = process.env.E2E_SCREENSHOTS === "1"
const browser = await chromium.launch()
const problems = []

async function open(options, url = "/") {
    const page = await browser.newPage(options)
    collectProblems(page, problems)
    await page.goto(`${BASE}${url}`, { waitUntil: "load" })
    return page
}

async function scrollThroughPage(page, viewport, name) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    let index = 1
    for (let y = 0; y < height; y += viewport.height * 0.8) {
        await page.mouse.wheel(0, viewport.height * 0.8)
        await page.waitForTimeout(1300)
        if (SCREENSHOTS) await page.screenshot({ path: path.join(OUT, `${name}-${String(index).padStart(2, "0")}.png`) })
        index += 1
    }
}

// --- animation behaviour
{
    const viewport = { width: 1440, height: 900 }
    const page = await open({ viewport })
    await page.waitForTimeout(4500)
    if (SCREENSHOTS) await page.screenshot({ path: path.join(OUT, "desktop-00.png") })
    check("the page has a title", (await page.title()).includes("StealthVault"), await page.title())

    const heroOpacity = () =>
        page.evaluate(() =>
            [".hero-subtext", ".hero-btns", ".hero-tag", ".trust-container"]
                .map((selector) => getComputedStyle(document.querySelector(selector)).opacity)
                .join(","),
        )
    const before = await heroOpacity()
    for (let i = 0; i < 10; i++) {
        await page.mouse.move(200 + i * 80, 200 + i * 40)
        await page.waitForTimeout(30)
    }
    await page.waitForTimeout(150)
    const after = await heroOpacity()
    check("the hero stays visible when the mouse moves", before === "1,1,1,1" && after === "1,1,1,1", `${before} / ${after}`)
    check(
        "the parallax still follows the pointer",
        (await page.evaluate(() => getComputedStyle(document.querySelector(".parallax-layer")).transform)) !== "none",
    )

    await page.waitForTimeout(5000) // past the plane's 4s delay
    const animated = await page.evaluate(() =>
        [...document.querySelectorAll("svg")]
            .filter((svg) => svg.style.transform && svg.style.transform !== "none" && svg.style.transform !== "translate(0px, 0px)")
            .map((svg) => svg.classList.contains("plane-svg")),
    )
    check("only the plane svg is animated", animated.length === 1 && animated[0], `${animated.length} moved`)

    const litPixels = await page.evaluate(() => {
        const canvas = document.querySelector("#top canvas")
        const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
        let lit = 0
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) lit += 1
        return lit
    })
    check("the floating letters are drawn", litPixels > 500, `${litPixels} pixels`)

    const dead = await page.evaluate(() => {
        const selectors = new Set()
        const walk = (rules) => {
            for (const rule of rules) {
                if (rule.selectorText) {
                    for (const match of rule.selectorText.match(/\.(?:\\.|[\w-])+/g) ?? []) selectors.add(match.slice(1).replace(/\\/g, ""))
                }
                if (rule.cssRules) walk(rule.cssRules)
            }
        }
        for (const sheet of document.styleSheets) walk(sheet.cssRules)
        const tokens = new Set()
        document.querySelectorAll("[class]").forEach((element) => {
            element.getAttribute("class").split(/\s+/).forEach((token) => token && tokens.add(token))
        })
        return [...tokens].filter((token) => !selectors.has(token))
    })
    // These classes exist only as animation hooks or come from libraries.
    const hooks = /^(lucide|hero-|phone-|dashboard-|parallax-|bg-grid-|mouse-glow|phantom-|trust-|plane-|scribble|floating-|carousel-|card-inner|white-editorial|group|lenis|__)/
    const unstyled = dead.filter((token) => !hooks.test(token))
    check("every class used has a CSS rule", unstyled.length === 0, unstyled.join(" "))

    for (const index of [0, 1]) {
        await page.evaluate((i) => document.querySelectorAll(".scribble")[i].scrollIntoView({ block: "center" }), index)
        await page.waitForTimeout(1500)
    }
    await page.waitForTimeout(2000)
    const strokes = await page.evaluate(() =>
        [...document.querySelectorAll(".scribble path")].map((path) => parseFloat(getComputedStyle(path).strokeDashoffset)),
    )
    check("the scribbles finish fully drawn", strokes.every((offset) => offset === 0), strokes.join(","))

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(1500)
    await scrollThroughPage(page, viewport, "desktop")
    check("the navbar stays pinned at the end of the page", (await page.evaluate(() => document.querySelector("nav").getBoundingClientRect().top)) === 0)
    await page.close()
}

// --- links and controls
{
    const page = await open({ viewport: { width: 1440, height: 900 } })
    await page.waitForTimeout(3500)
    const nav = page.getByRole("navigation", { name: "Main" })
    const sectionTop = (selector) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, selector)

    const hrefs = await page.evaluate(() => [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")))
    check("no empty links", hrefs.every((href) => href && href !== "#"), `${hrefs.length} links`)
    for (const hash of new Set(hrefs.filter((href) => href.startsWith("#")))) {
        check(`anchor target exists: ${hash}`, await page.evaluate((s) => Boolean(document.querySelector(s)), hash))
    }
    check(
        "icon-only buttons are labelled",
        (await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !b.getAttribute("aria-label") && !b.innerText.trim()).length)) === 0,
    )

    for (const [label, target] of [["How It Works", "#how-it-works"], ["Security", "#security"], ["FAQ", "#faq"]]) {
        await nav.getByRole("link", { name: label }).click()
        await page.waitForTimeout(2000)
        const top = await sectionTop(target)
        check(`nav link lands just under the navbar: ${target}`, top >= 0 && top <= 110, `top=${Math.round(top)}`)
    }
    await nav.getByRole("link", { name: "StealthVault" }).click()
    await page.waitForTimeout(2000)
    check("the logo returns to the top", (await page.evaluate(() => window.scrollY)) < 5)
    await page.getByRole("link", { name: "See How It Works" }).click()
    await page.waitForTimeout(2200)
    check("See How It Works scrolls to the steps", Math.abs(await sectionTop("#how-it-works")) < 110)

    const carousel = page.locator(".carousel-container")
    const previous = page.getByRole("button", { name: "Previous step" })
    const next = page.getByRole("button", { name: "Next step" })
    check("the carousel starts with Previous disabled", await previous.isDisabled())
    await next.click()
    await page.waitForTimeout(900)
    check("the carousel Next button moves", (await carousel.evaluate((el) => el.scrollLeft)) > 100)
    for (let i = 0; i < 6 && (await next.isEnabled()); i++) {
        await next.click()
        await page.waitForTimeout(800)
    }
    check("the carousel stops at the last step", await next.isDisabled())
    await previous.click()
    await page.waitForTimeout(800)
    check("the carousel Previous button moves back", await next.isEnabled())

    const question = page.locator("#faq details").first()
    await question.locator("summary").click()
    check("FAQ answers open", await question.evaluate((details) => details.open))

    await page.goto(`${BASE}/`, { waitUntil: "load" })
    await page.waitForTimeout(3000)
    await page.getByRole("link", { name: "Create Vault" }).first().click()
    await page.waitForURL("**/vault")
    await page.getByRole("heading", { name: "Create your vault" }).waitFor()
    check("Create Vault opens the vault", true)
    await page.goBack()
    await page.waitForTimeout(4000)
    check("going back restores a working page", (await page.evaluate(() => getComputedStyle(document.querySelector(".hero-btns")).opacity)) === "1")
    await nav.getByRole("link", { name: "Open Vault" }).click()
    await page.waitForURL("**/vault")
    check("the navbar Open Vault link works", true)
    await page.close()
}

// --- layout at each width, checked with real element positions
for (const [name, viewport] of [
    ["small", { width: 320, height: 640 }],
    ["mobile", { width: 390, height: 844 }],
    ["tablet", { width: 768, height: 1024 }],
    ["laptop", { width: 1024, height: 768 }],
    ["wide", { width: 1920, height: 1080 }],
]) {
    const page = await open({ viewport })
    await page.waitForTimeout(3800)
    if (SCREENSHOTS) await page.screenshot({ path: path.join(OUT, `${name}-00.png`) })

    const overflowing = await page.evaluate(() => {
        const width = document.documentElement.clientWidth
        const isClipped = (element) => {
            for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
                if (getComputedStyle(parent).overflowX !== "visible") return true
            }
            return false
        }
        return [...document.querySelectorAll("main *")]
            .filter((element) => {
                if (element.closest("svg") || element.closest("[aria-hidden=true]")) return false
                const rect = element.getBoundingClientRect()
                return rect.width && (rect.right > width + 1 || rect.left < -1) && !isClipped(element)
            })
            .map((element) => (element.getAttribute("class") ?? element.tagName).slice(0, 50))
    })
    check(`${name}: nothing overflows`, overflowing.length === 0, overflowing.slice(0, 4).join(" | "))

    const headlineLines = await page.evaluate(() =>
        [".hero-line-1 span", ".hero-line-2 span"].map((selector) => {
            const element = document.querySelector(selector)
            return Math.round(element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight))
        }),
    )
    check(`${name}: headline lines don't wrap`, headlineLines.every((lines) => lines === 1), headlineLines.join(","))
    if (SCREENSHOTS) await scrollThroughPage(page, viewport, name)
    await page.close()
}

// --- nothing depends on animation to appear
{
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" })
    const page = await context.newPage()
    collectProblems(page, problems)
    await page.goto(`${BASE}/`, { waitUntil: "load" })
    await page.waitForTimeout(800)
    const opacity = await page.evaluate(() =>
        [".hero-tag", ".hero-subtext", ".hero-btns", ".trust-container"].map((s) => getComputedStyle(document.querySelector(s)).opacity),
    )
    check("reduced motion shows the hero immediately", opacity.every((value) => value === "1"), opacity.join(","))
    check("reduced motion keeps the headline word", (await page.locator(".white-editorial-section h2").innerText()).includes("Financial"))
    await context.close()
}

check("no console errors or warnings", problems.length === 0, [...new Set(problems)].slice(0, 5).join(" || "))
await browser.close()
finish()
