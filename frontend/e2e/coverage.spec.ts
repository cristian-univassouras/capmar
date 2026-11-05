import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(readFileSync("../docs/thiago/coverage-fixtures.json", "utf8"));
const api = process.env.E2E_API_URL ?? "http://localhost:8000";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3001";
if (![api, base].every((u) => ["localhost", "127.0.0.1"].includes(new URL(u).hostname))) throw Error("Somente local");
const headers = { Origin: base, "X-CSRF-Protection": "1" };
async function login(page: import("@playwright/test").Page) {
  expect((await page.request.post(api + "/auth/login", { headers, data: { email: fixture.prefix + "_00@example.com", password: "Capmar-Cobertura@123" } })).status()).toBe(200);
}

test("paginação de projetos e comentários preserva todos os resultados", async ({ page }) => {
  await page.goto("/home?q=QA%20Cobertura%201105");
  const results = page.getByRole("region", { name: "Busca de projetos" });
  await expect(results.getByRole("heading", { level: 2 })).toHaveCount(12);
  const names = [...await results.getByRole("heading", { level: 2 }).allTextContents()];
  const pages = page.getByRole("navigation", { name: "Paginação de projetos" });
  await pages.getByRole("button", { name: "Próxima" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(results.getByRole("heading", { level: 2 })).toHaveCount(12);
  names.push(...await results.getByRole("heading", { level: 2 }).allTextContents());
  await pages.getByRole("button", { name: "Próxima" }).click();
  await expect(results.getByRole("heading", { level: 2 })).toHaveCount(1);
  names.push(...await results.getByRole("heading", { level: 2 }).allTextContents());
  expect(new Set(names).size).toBe(25);
  await expect(pages.getByRole("button", { name: "Próxima" })).toBeDisabled();
  await pages.getByRole("button", { name: "Anterior" }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.goto("/projeto/" + fixture.projects[0] + "#comentarios");
  await expect(page.getByText(/^QA comentário/)).toHaveCount(20);
  await page.getByRole("button", { name: "Carregar mais comentários" }).click();
  await expect(page.getByText(/^QA comentário/)).toHaveCount(40);
  await page.getByRole("button", { name: "Carregar mais comentários" }).click();
  await expect(page.getByText(/^QA comentário/)).toHaveCount(55);
});

test("chat carrega históricos extensos e permite repetir envio após falha sem duplicar", async ({ page }) => {
  await login(page); await page.goto("/chat");
  await expect(page.getByRole("button", { name: /^@qacov_1105/ })).toHaveCount(30);
  await page.getByRole("button", { name: "Carregar conversas anteriores" }).click();
  await expect(page.getByRole("button", { name: /^@qacov_1105/ })).toHaveCount(34);
  await page.getByRole("button", { name: "@qacov_1105_34", exact: true }).click();
  const room = page.getByRole("region", { name: "Conversa", exact: true });
  await expect(room.getByRole("list", { name: "Mensagens", exact: true }).getByRole("listitem")).toHaveCount(50);
  await room.getByRole("button", { name: "Carregar mensagens anteriores" }).click();
  await expect(room.getByText(/^QA histórico/)).toHaveCount(65);
  await page.route("**/chat/conversations/*/messages", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  const text = "QA repetição segura " + Date.now();
  await room.getByRole("textbox", { name: "Mensagem", exact: true }).fill(text);
  await room.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(room.getByRole("alert")).toBeVisible();
  await expect(room.getByText(text, { exact: true })).toHaveCount(1);
  await page.unroute("**/chat/conversations/*/messages");
  await room.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(room.getByText(text, { exact: true })).toHaveCount(1);
});

test("logout em outra aba remove projeto privado e sessão interna", async ({ page, context }) => {
  await login(page);
  await page.goto("/projeto/" + fixture.private);
  await expect(page.getByRole("heading", { name: "QA Cobertura 1105 privado", exact: true })).toBeVisible();
  const other = await context.newPage(); await other.goto("/feed");
  if (!await other.getByRole("button", { name: "Sair", exact: true }).isVisible()) await other.getByRole("button", { name: "Mais", exact: true }).click();
  await other.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Projeto não encontrado ou sem acesso" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerenciar" })).toHaveCount(0);
});

test("upload com falha mantém formulário e permite novo envio; link ausente não pede senha", async ({ page }) => {
  await login(page); await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  const form = page.getByRole("form", { name: "Cadastrar projeto" });
  await form.getByLabel("Nome do projeto", { exact: true }).fill("Rascunho preservado QA");
  await page.route("**/upload", (route) => route.abort("failed"));
  await form.getByLabel("Arquivo do portfólio", { exact: true }).setInputFiles("e2e/fixtures/picture.png");
  await expect(form.getByRole("alert")).toBeVisible();
  await expect(form.getByLabel("Nome do projeto", { exact: true })).toHaveValue("Rascunho preservado QA");
  await page.unroute("**/upload");
  await form.getByLabel("Arquivo do portfólio", { exact: true }).setInputFiles("e2e/fixtures/picture.png");
  await expect(form.getByText(/Arquivo enviado/)).toBeVisible();
  await form.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.goto("/redefinir-senha");
  await expect(page.getByRole("alert").filter({ hasText: "Link inválido ou ausente" })).toBeVisible();
  await expect(page.getByLabel("Nova senha", { exact: true })).toHaveCount(0);
});

for (const mode of ["success", "cancel", "error", "unavailable"]) {
  test("compartilhamento nativo: " + mode, async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript((mode) => Object.defineProperty(navigator, "share", { configurable: true, value: mode === "unavailable" ? undefined : async () => {
      if (mode === "cancel") throw new DOMException("Cancelado", "AbortError");
      if (mode === "error") throw new Error("Indisponível");
    } }), mode);
    await page.goto("/projeto/" + fixture.projects[0]);
    await page.getByRole("button", { name: "Compartilhar", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Mais opções" }).click();
    await expect(dialog.getByLabel("Link público")).toHaveValue(base + "/projeto/" + fixture.projects[0]);
    if (mode === "error") await expect(dialog.getByRole("status")).toHaveText("Compartilhamento indisponível. Use Copiar link.");
    else if (mode === "unavailable") await expect(dialog.getByRole("status")).toHaveText("Link copiado!");
    else await expect(dialog.getByText("Compartilhamento indisponível. Use Copiar link.")).toHaveCount(0);
  });
}
