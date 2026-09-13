import { test, expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
const api = process.env.E2E_API_URL ?? "http://localhost:8000";
if (!["localhost", "127.0.0.1"].includes(new URL(api).hostname)) throw new Error("Somente ambiente local");
const headers = { Origin: "http://localhost:3000", "X-CSRF-Protection": "1" };
const demoPassword = process.env.E2E_CHAT_PASSWORD ?? "Capmar-E2E@123";
async function login(page: Page, username: string) {
  const response = await page.request.post(api + "/auth/login", { headers, data: { email: username + "@example.com", password: demoPassword } });
  expect(response.status()).toBe(200);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}
function otp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replace(/=/g, "")].map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0")).join("");
  const bytes = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", bytes).update(counter).digest();
  return ((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}

test("chat entrega mensagem, responde e recupera ao reconectar", async ({ page, browser }, info) => {
  await login(page, "e2e_alice");
  const bobContext = await browser.newContext({ baseURL: "http://localhost:3000", viewport: { width: 390, height: 844 } });
  const bob = await bobContext.newPage();
  try {
    await login(bob, "e2e_bob");
    await page.goto("/chat");
    await page.getByRole("button", { name: "Nova conversa", exact: true }).click();
    const form = page.getByRole("form", { name: "Nova conversa" });
    const title = "Chat E2E " + info.project.name + " " + Date.now();
    await form.getByLabel("Título da conversa").fill(title);
    await form.getByLabel("@e2e_bob", { exact: true }).check();
    await form.getByRole("button", { name: "Criar conversa" }).click();
    const room = page.getByRole("region", { name: "Conversa", exact: true });
    await expect(room.getByRole("status")).toHaveText("Conectado");
    await bob.goto("/chat");
    await bob.getByRole("button", { name: title, exact: true }).click();
    const other = bob.getByRole("region", { name: "Conversa", exact: true });
    await expect(other.getByRole("status")).toHaveText("Conectado");
    await room.getByLabel("Mensagem", { exact: true }).fill("Olá da Alice");
    await room.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(other.getByText("Olá da Alice", { exact: true })).toBeVisible();
    await other.getByLabel("Mensagem", { exact: true }).fill("Resposta do Bob");
    await other.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(room.getByText("Resposta do Bob", { exact: true })).toBeVisible();
    await room.getByRole("button", { name: "Reconectar", exact: true }).click();
    await expect(room.getByRole("status")).toHaveText("Conectado");
    await expect(room.getByText("Olá da Alice", { exact: true })).toHaveCount(1);
    await noOverflow(page); await noOverflow(bob);
    await page.screenshot({ path: "../docs/thiago/chat-" + info.project.name + ".png", fullPage: true });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
  } finally { await bobContext.close(); }
});

test("SEO inicial, apoio, autoria e transição público/privado", async ({ page, browser }) => {
  await login(page, "e2e_alice");
  const name = "SEO público " + Date.now();
  const result = await page.request.post(api + "/projects", { headers, data: { name, description: "Descrição pública exclusiva para prévia", authorship: "group", responsible_names: "Alice e Bob", funding_url: "https://example.com/apoio" } });
  expect(result.status()).toBe(201);
  const id = (await result.json()).project_id;
  try {
    const response = await page.request.get("/projeto/" + id);
    const html = await response.text();
    expect(html).toContain("<title>" + name + " | CapMar</title>");
    expect(html).toContain('property="og:title"');
    expect(html).toContain("Descrição pública exclusiva para prévia");
    expect(html).toContain("Alice e Bob");
    const staticContext = await browser.newContext({ javaScriptEnabled: false });
    try {
      const staticPage = await staticContext.newPage();
      await staticPage.goto("http://localhost:3000/projeto/" + id);
      await expect(staticPage.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(staticPage.getByText("Responsáveis: Alice e Bob", { exact: true })).toBeVisible();
    } finally { await staticContext.close(); }
    const preview = await page.request.get("/projeto/" + id + "/preview");
    expect(preview.status()).toBe(200); expect(preview.headers()["content-type"]).toContain("image/png");
    await page.goto("/projeto/" + id);
    await expect(page.getByText("Projeto em grupo", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir página de apoio" })).toHaveAttribute("href", "https://example.com/apoio");
    await noOverflow(page);
    expect((await page.request.patch(api + "/projects/" + id, { headers, data: { visibility: false } })).status()).toBe(200);
    const privateHtml = await (await page.request.get("/projeto/" + id)).text();
    expect(privateHtml).not.toContain(name);
    expect(privateHtml).not.toContain("Alice e Bob");
    expect(privateHtml).not.toContain("example.com/apoio");
    expect(privateHtml).toContain('content="noindex, nofollow"');
    expect((await page.request.get("/projeto/" + id + "/preview")).status()).toBe(404);
  } finally { await page.request.delete(api + "/projects/" + id, { headers }); }
});

test("administrador com MFA modera e registra ações; painel funciona no celular", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Mesmo fluxo administrativo inspeciona três larguras na mesma sessão MFA");
  test.skip(!process.env.E2E_ADMIN_SECRET || !process.env.E2E_ADMIN_PASSWORD, "Configure a conta administrativa local com MFA");
  await login(page, "e2e_alice");
  const current = await (await page.request.get(api + "/auth/me")).json();
  const post = await (await page.request.post(api + "/posts", { headers, data: { content: "Publicação E2E para moderação " + Date.now() } })).json();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_ADMIN_EMAIL ?? "admin.demo@example.com");
  await page.getByLabel("Senha", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByLabel("Código do autenticador (se ativado)").fill(otp(process.env.E2E_ADMIN_SECRET!));
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/feed$/);
  await page.goto("/admin");
  const userForm = page.getByRole("form", { name: "Gerenciar e2e_alice", exact: true });
  await userForm.getByLabel("Conta ativa").uncheck();
  await userForm.getByLabel("Motivo").fill("Teste de suspensão administrativa");
  await userForm.getByRole("button", { name: "Salvar usuário" }).click();
  await expect(userForm.getByLabel("Conta ativa")).not.toBeChecked();
  await userForm.getByLabel("Conta ativa").check();
  await userForm.getByLabel("Motivo").fill("Teste de reativação administrativa");
  await userForm.getByRole("button", { name: "Salvar usuário" }).click();
  await expect(userForm.getByLabel("Conta ativa")).toBeChecked();
  await page.getByRole("button", { name: "Moderação", exact: true }).click();
  const moderation = page.getByRole("form", { name: "Moderar publicação " + post.post_id, exact: true });
  await moderation.getByLabel("Motivo").fill("Teste de moderação auditada " + post.post_id);
  await moderation.getByRole("button", { name: "Ocultar publicação" }).click();
  await expect(moderation.getByRole("button", { name: "Restaurar publicação" })).toBeVisible();
  await page.getByRole("button", { name: "Auditoria", exact: true }).click();
  await expect(page.getByText("Teste de moderação auditada " + post.post_id, { exact: true })).toBeVisible();
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 900 }); await noOverflow(page);
    await page.screenshot({ path: "../docs/thiago/admin-" + width + ".png", fullPage: true });
  }
  // Restaura estado da conta de teste mesmo se o próximo teste usar outra viewport.
  expect((await page.request.patch(api + "/admin/users/" + current.user_id, { headers, data: { role: "user", is_active: true, reason: "Finalização dos testes locais" } })).status()).toBe(200);
  await login(page, "e2e_alice");
  expect((await page.request.delete(api + "/posts/" + post.post_id, { headers })).status()).toBe(204);
});
