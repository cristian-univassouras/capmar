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
  const bobContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", viewport: { width: 390, height: 844 } });
  const bob = await bobContext.newPage();
  try {
    await login(bob, "e2e_bob");
    const aliceUser = await (await page.request.get(api + "/auth/me")).json();
    const bobUser = await (await bob.request.get(api + "/auth/me")).json();
    await page.goto("/usuario/" + aliceUser.user_id);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar mensagem", exact: true })).toHaveCount(0);
    await page.goto("/usuario/" + bobUser.user_id);
    await page.getByRole("button", { name: "Enviar mensagem", exact: true }).click();
    await expect(page).toHaveURL(/\/chat\?conversation=\d+$/);
    const cid = new URL(page.url()).searchParams.get("conversation");
    const greeting = "Olá da Alice " + Date.now();
    const reply = "Resposta do Bob " + Date.now();
    const room = page.getByRole("region", { name: "Conversa", exact: true });
    await expect(room.getByRole("status")).toHaveText("Conectado");
    await bob.goto("/usuario/" + aliceUser.user_id);
    await bob.getByRole("button", { name: "Enviar mensagem", exact: true }).click();
    await expect(bob).toHaveURL((process.env.E2E_BASE_URL ?? "http://localhost:3000") + "/chat?conversation=" + cid);
    await expect(page.getByRole("button", { name: "Nova conversa", exact: true })).toHaveCount(0);
    const other = bob.getByRole("region", { name: "Conversa", exact: true });
    await expect(other.getByRole("status")).toHaveText("Conectado");
    await room.getByLabel("Mensagem", { exact: true }).fill(greeting);
    await room.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(other.getByText(greeting, { exact: true })).toBeVisible();
    await other.getByLabel("Mensagem", { exact: true }).fill(reply);
    await other.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(room.getByText(reply, { exact: true })).toBeVisible();
    await room.getByLabel("Opções da conversa").click();
    await room.getByRole("button", { name: "Reconectar", exact: true }).click();
    await expect(room.getByRole("status")).toHaveText("Conectado");
    await expect(room.getByText(greeting, { exact: true })).toHaveCount(1);
    await noOverflow(page); await noOverflow(bob);
    await page.screenshot({ path: "../docs/thiago/chat-" + info.project.name + ".png", fullPage: true });
    const projectResponse = await page.request.post(api + "/projects", { headers, data: { name: "Equipe chat E2E " + Date.now(), visibility: false } });
    expect(projectResponse.status()).toBe(201);
    const pid = (await projectResponse.json()).project_id;
    try {
      const teamResponse = await page.request.post(api + "/teams", { headers, data: { team_name: "Equipe chat " + Date.now(), project_id: pid } });
      expect(teamResponse.status()).toBe(201);
      const team = await teamResponse.json();
      expect((await page.request.post(api + "/teams/" + team.team_id + "/members", { headers, data: { user_id: bobUser.user_id } })).status()).toBe(200);
      await page.goto("/equipe/" + team.team_id);
      await page.getByRole("link", { name: "Chat da equipe", exact: true }).click();
      await expect(room.getByRole("heading", { name: team.team_name, exact: true })).toBeVisible();
      await bob.goto("/chat");
      await bob.getByRole("button", { name: team.team_name, exact: true }).click();
      await expect(other.getByRole("status")).toHaveText("Conectado");
      const teamMessage = "Mensagem coletiva " + Date.now();
      await room.getByLabel("Mensagem", { exact: true }).fill(teamMessage);
      await room.getByRole("button", { name: "Enviar mensagem" }).click();
      await expect(other.getByText(teamMessage, { exact: true })).toBeVisible();
      await noOverflow(page); await noOverflow(bob);
      expect((await page.request.delete(api + "/teams/" + team.team_id + "/members/" + bobUser.user_id, { headers })).status()).toBe(200);
      await expect(other.getByRole("status")).toContainText("acesso encerrado");
      await expect(other.getByText(teamMessage, { exact: true })).toHaveCount(0);
      await bob.goto("/chat");
      await expect(bob.getByRole("button", { name: team.team_name, exact: true })).toHaveCount(0);
    } finally { expect((await page.request.delete(api + "/projects/" + pid, { headers })).status()).toBe(204); }
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
  } finally { await bobContext.close(); }
});

test("mensagem pelo perfil encaminha visitante ao login e retorna ao perfil", async ({ page }) => {
  const users = await (await page.request.get(api + "/users?q=e2e_bob")).json();
  const recipient = users.find((u: { username: string }) => u.username === "e2e_bob");
  expect(recipient).toBeTruthy();
  const profile = "/usuario/" + recipient.user_id;
  await page.goto(profile);
  await page.getByRole("button", { name: "Enviar mensagem", exact: true }).click();
  await expect(page).toHaveURL((process.env.E2E_BASE_URL ?? "http://localhost:3000") + "/login?next=" + encodeURIComponent(profile));
  await page.getByLabel("E-mail").fill("e2e_alice@example.com");
  await page.getByLabel("Senha", { exact: true }).fill(demoPassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL((process.env.E2E_BASE_URL ?? "http://localhost:3000") + profile);
  await page.getByRole("button", { name: "Enviar mensagem", exact: true }).click();
  await expect(page.getByRole("region", { name: "Conversa", exact: true }).getByRole("heading", { name: "@e2e_bob" })).toBeVisible();
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
      await staticPage.goto((process.env.E2E_BASE_URL ?? "http://localhost:3000") + "/projeto/" + id);
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
  test.setTimeout(90000);
  await page.waitForTimeout(31000-(Date.now()%30000)); // Cada login MFA usa uma janela nova; nunca reutiliza o código da reautenticação anterior.
  await login(page, "e2e_alice");
  const current = await (await page.request.get(api + "/auth/me")).json();
  const post = await (await page.request.post(api + "/posts", { headers, data: { content: "Publicação E2E para moderação " + Date.now() } })).json();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_ADMIN_EMAIL ?? "admin.demo@example.com");
  await page.getByLabel("Senha", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByLabel("Uso um aplicativo autenticador").check();
  await page.getByLabel("Código do autenticador (se ativado)").fill(otp(process.env.E2E_ADMIN_SECRET!));
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/feed$/);
  await page.goto("/admin");
  await expect(page.getByRole("table", { name: "Gestão de usuários", exact: true })).toBeVisible();
  const userRow = page.getByRole("row").filter({ has: page.getByRole("link", { name: "Ver perfil de @e2e_alice", exact: true }) });
  const userForm = userRow.getByRole("form", { name: "Gerenciar e2e_alice", exact: true });
  const adminRow = page.getByRole("row").filter({ has: page.getByRole("link", { name: "Ver perfil de @demo_admin", exact: true }) });
  await expect(adminRow.getByLabel("Conta ativa")).toBeDisabled();
  try {
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 900 }); await noOverflow(page);
    await page.screenshot({ path: "../docs/thiago/admin-users-" + width + ".png", fullPage: true });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  await userRow.getByRole("button", { name: "Gerenciar conta" }).click();
  await userRow.getByLabel("Conta ativa").uncheck();
  await userForm.getByLabel("Motivo").fill("Teste de suspensão administrativa");
  await userForm.getByRole("button", { name: "Salvar usuário" }).click();
  await expect(userRow.getByLabel("Conta ativa")).not.toBeChecked();
  await userRow.getByRole("button", { name: "Gerenciar conta" }).click();
  await userRow.getByLabel("Conta ativa").check();
  await userForm.getByLabel("Motivo").fill("Teste de reativação administrativa");
  await userForm.getByRole("button", { name: "Salvar usuário" }).click();
  await expect(userRow.getByLabel("Conta ativa")).toBeChecked();
  await page.getByRole("button", { name: "Moderação", exact: true }).click();
  await expect(page.getByRole("table", { name: "Moderação de publicações", exact: true })).toBeVisible();
  const moderation = page.getByRole("form", { name: "Moderar publicação " + post.post_id, exact: true, includeHidden: true });
  await page.getByRole("row").filter({has:moderation}).getByRole("button",{name:"Revisar publicação"}).click();
  await moderation.getByLabel("Motivo").fill("Teste de moderação auditada " + post.post_id);
  await moderation.getByRole("button", { name: "Ocultar publicação" }).click();
  await expect(moderation.getByRole("button", { name: "Restaurar publicação" })).toBeVisible();
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 900 }); await noOverflow(page);
    await page.screenshot({ path: "../docs/thiago/admin-posts-" + width + ".png", fullPage: true });
  }
  await page.getByRole("button", { name: "Auditoria", exact: true }).click();
  await expect(page.getByRole("table", { name: "Registro de auditoria", exact: true })).toBeVisible();
  await expect(page.getByText("Teste de moderação auditada " + post.post_id, { exact: true })).toBeVisible();
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 900 }); await noOverflow(page);
    await page.screenshot({ path: "../docs/thiago/admin-" + width + ".png", fullPage: true });
  }
  } finally {
  // Restaura estado da conta de teste mesmo se o próximo teste usar outra viewport.
  expect((await page.request.patch(api + "/admin/users/" + current.user_id, { headers, data: { role: "user", is_active: true, reason: "Finalização dos testes locais" } })).status()).toBe(200);
  await login(page, "e2e_alice");
  expect((await page.request.delete(api + "/posts/" + post.post_id, { headers })).status()).toBe(204);
  }
});
