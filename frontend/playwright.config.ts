import { defineConfig } from "@playwright/test";
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("E2E permitido somente no ambiente local.");
export default defineConfig({
  testDir: "./e2e", workers: 1, fullyParallel: false, timeout: 45000,
  outputDir: "../docs/thiago/playwright-results",
  reporter: [["list"], ["html", { outputFolder: "../docs/thiago/playwright-report", open: "never" }]],
  use: { baseURL, browserName: "chromium", locale: "pt-BR", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1366, height: 900 } } },
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "mobile-320", use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
  ],
});
