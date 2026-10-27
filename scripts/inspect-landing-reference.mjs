import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("artifacts/landing", { recursive: true });
const browser = await chromium.launch({ headless: true });
const findings = [];
for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["tablet", 768, 1024],
  ["mobile", 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto("https://saas-magicui.vercel.app", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: `artifacts/landing/reference-${name}-hero.png`,
  });
  findings.push(
    await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      links: [...document.querySelectorAll("header a")].map((a) => ({
        text: a.textContent,
        href: a.getAttribute("href"),
      })),
      headings: [...document.querySelectorAll("h1,h2,h3")]
        .slice(0, 30)
        .map((e) => ({
          text: e.textContent,
          fontFamily: getComputedStyle(e).fontFamily,
          fontSize: getComputedStyle(e).fontSize,
          fontWeight: getComputedStyle(e).fontWeight,
          lineHeight: getComputedStyle(e).lineHeight,
          color: getComputedStyle(e).color,
        })),
      nav: document.querySelector("header")?.outerHTML.slice(0, 3000),
      overflow: document.documentElement.scrollWidth > innerWidth,
    })),
  );
  // Reveal sections that animate only after entering the viewport.
  for (
    let y = 0;
    y < (await page.locator("body").evaluate((e) => e.scrollHeight));
    y += height * 0.75
  ) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(160);
  }
  await page.screenshot({
    path: `artifacts/landing/reference-${name}-full.png`,
    fullPage: true,
  });
  if (name === "desktop") {
    await page
      .getByRole("heading", { name: "Empower Your Business with AI Workflows" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "artifacts/landing/reference-desktop-solutions.png",
    });
    await page
      .getByRole("heading", { name: "Frequently asked questions" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "artifacts/landing/reference-desktop-faq.png",
    });
    const blog = page.getByRole("link", { name: /August 29, 2024/ });
    console.log("blog link", await blog.getAttribute("href"));
  }
  await page.close();
}
await writeFile(
  "artifacts/landing/reference-inspection.json",
  JSON.stringify(findings, null, 2),
);
await browser.close();
