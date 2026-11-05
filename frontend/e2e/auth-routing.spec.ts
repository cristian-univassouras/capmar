import { test, expect } from "@playwright/test";
test("login inválido explica credenciais e alternar cadastro preserva retorno ao projeto", async ({ page }) => {
  await page.goto("/login?next=" + encodeURIComponent("/projeto/1"));
  await page.getByLabel("E-mail", { exact: true }).fill("inexistente-qa@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("Senha-Invalida@123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha inválidos" })).toBeVisible();
  await page.getByRole("link", { name: "Criar conta", exact: true }).click();
  await expect(page).toHaveURL(/\/register\?next=%2Fprojeto%2F1$/);
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fprojeto%2F1$/);
  await page.getByLabel("E-mail", { exact: true }).fill("e2e_alice@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("Capmar-E2E@123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/projeto\/1$/);
  await expect(page.getByRole("heading", { level: 1, name: "Feira Criativa de Maricá" })).toBeVisible();
});
