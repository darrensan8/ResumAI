// Captures every route at desktop + mobile widths so the redesign can be
// reviewed visually. Assumes the dev server is already running.
// Usage: npm run shots   (override base URL with BASE_URL=...)
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const OUT = new URL('../screenshots/', import.meta.url).pathname

const routes = [
  { name: 'upload-resume', path: '/' },
  { name: 'job-description', path: '/job-description' },
  { name: 'analysis', path: '/analysis?mock=1' },
]

const viewports = [
  { tag: 'desktop', width: 1280, height: 900 },
  { tag: 'mobile', width: 390, height: 844 },
]

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  for (const route of routes) {
    await page.goto(BASE + route.path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400) // let blur/transitions settle
    const file = `${OUT}${route.name}-${vp.tag}.png`
    await page.screenshot({ path: file, fullPage: true })
    console.log('saved', file)
  }
  await ctx.close()
}

await browser.close()
