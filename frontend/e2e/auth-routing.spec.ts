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

const protectedRoutes = ["/feed", "/projetos", "/equipes", "/equipe/5", "/perfil", "/chat", "/seguranca", "/admin"];
for (const route of protectedRoutes) {
  test(`visitante em ${route} é levado ao login e volta depois`, async ({ page }) => {
    await page.goto(route);
    await expect.poll(() => { const url = new URL(page.url()); return url.pathname + url.search; }).toBe("/login?next=" + encodeURIComponent(route));
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  });
}

test("quem já está logado não vê login nem cadastro e cai no feed", async ({ page }) => {
  const api = process.env.E2E_API_URL ?? "http://localhost:8000";
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const response = await page.request.post(api + "/auth/login", { headers: { Origin: base, "X-CSRF-Protection": "1" }, data: { email: "e2e_alice@example.com", password: "Capmar-E2E@123" } });
  expect(response.status()).toBe(200);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/feed$/);
  await page.goto("/register?next=" + encodeURIComponent("/projetos"));
  await expect(page).toHaveURL(/\/projetos$/);
});
