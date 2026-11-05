import { test, expect, type Page } from "@playwright/test";

const api = process.env.E2E_API_URL ?? "http://localhost:8000";
if (!["localhost", "127.0.0.1"].includes(new URL(api).hostname)) throw new Error("API de E2E deve ser local.");
const email = process.env.E2E_EMAIL ?? "ana.demo@example.com";
const password = process.env.E2E_PASSWORD ?? "Capmar@123";
const headers = { "X-CSRF-Protection": "1", Origin: "http://localhost:3000" };

async function noOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport + 1);
}

test("visitante navega, busca e lê projeto e perfil sem login", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await noOverflow(page);
  await expect(page.getByRole("link", { name: "Criar conta", exact: true }).first()).toHaveAttribute("href", "/register");
  expect(await page.locator('a[href="#"],a[href="/start"]').count()).toBe(0);
  if (info.project.name.startsWith("mobile")) {
    const toggle = page.getByRole("button", { name: "Abrir menu" });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("navigation", { name: "Menu móvel" }).getByRole("link", { name: "Explorar projetos" }).click();
  } else {
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Explorar projetos" }).click();
  }
  await expect(page).toHaveURL(/\/home$/);
  const search = page.getByRole("region", { name: "Busca de projetos" });
  await search.getByLabel("Buscar projetos").fill("Feira");
  await search.getByRole("combobox", { name: "Categoria", exact: true }).selectOption({ label: "Artesanato" });
  await search.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(search.getByRole("heading", { name: "Feira Criativa de Maricá" })).toBeVisible();
  await expect(page).toHaveURL(/q=Feira/);
  await page.reload();
  await expect(search.getByLabel("Buscar projetos")).toHaveValue("Feira");
  await search.getByRole("link").filter({ has: page.getByRole("heading", { name: "Feira Criativa de Maricá" }) }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Feira Criativa de Maricá" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Comentários/ })).toBeVisible();
  await page.getByRole("tab", { name: /^Equipe/ }).click();
  await expect(page).toHaveURL(/#equipe$/);
  await expect(page.getByRole("tabpanel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerenciar" })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: "../docs/thiago/projeto-publico-" + info.project.name + ".png", fullPage: true });
  await page.getByRole("link", { name: /Ana Martins/ }).first().click();
  await expect(page.getByRole("heading", { name: "Ana Martins" })).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toHaveCount(0);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("cadastro com imagens e tags, edição, erro de comentário e exclusão", async ({ page }, info) => {
  let id: number | null = null;
  page.setDefaultTimeout(10000);
  const name = "Teste vitrine " + info.project.name + " " + Date.now();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/feed$/);
  try {
    await page.goto("/projetos");
    await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
    const form = page.getByRole("form", { name: "Cadastrar projeto" });
    await form.getByLabel("Nome do projeto", { exact: true }).fill(name);
    await form.getByRole("textbox", { name: "Descrição", exact: true }).fill("Descrição de teste de cadastro completo.");
    await form.getByRole("combobox", { name: "Categoria", exact: true }).selectOption({ label: "Tecnologia" });
    await form.getByLabel("Palavras-chave", { exact: true }).fill(" Teste , MARICÁ, teste");
    await form.getByLabel("Capa do projeto", { exact: true }).setInputFiles("e2e/fixtures/picture.png");
    await form.getByLabel("Logo do projeto", { exact: true }).setInputFiles("e2e/fixtures/picture.png");
    await expect(form.getByRole("button", { name: "Criar projeto", exact: true })).toBeEnabled();
    await noOverflow(page);
    await page.screenshot({ path: "../docs/thiago/cadastro-" + info.project.name + ".png", fullPage: true });
    await form.getByRole("button", { name: "Criar projeto", exact: true }).click();
    await expect(page).toHaveURL(/\/projeto\/\d+$/);
    id = Number(new URL(page.url()).pathname.split("/").pop());
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByRole("img", { name: "Capa de " + name })).toBeVisible();
    await expect(page.getByRole("link", { name: "#maricá", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "#teste", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Gerenciar", exact: true }).click();
    await page.getByRole("menuitem", { name: "Editar projeto", exact: true }).click();
    const edit = page.getByRole("form", { name: "Editar projeto" });
    await edit.getByLabel("Palavras-chave", { exact: true }).fill("revisado");
    await edit.getByRole("textbox", { name: "Descrição", exact: true }).fill("");
    await edit.getByLabel("Projeto visível publicamente").uncheck();
    await edit.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByRole("link", { name: "#revisado", exact: true })).toBeVisible();
    await expect(page.getByText("Este projeto ainda não tem uma descrição.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "#revisado", exact: true })).toBeVisible();
    const guest = await page.context().browser()!.newContext();
    const visitor = await guest.newPage();
    await visitor.goto(page.url());
    await expect(visitor.getByRole("heading", { name: "Projeto não encontrado ou sem acesso" })).toBeVisible();
    await expect(visitor.getByRole("heading", { name, exact: true })).toHaveCount(0);
    await guest.close();
    await page.route("**/projects/" + id + "/comments", (route) => route.fulfill({
      status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Falha controlada no comentário" }),
      headers: { "Access-Control-Allow-Origin": process.env.E2E_BASE_URL ?? "http://localhost:3000", "Access-Control-Allow-Credentials": "true" },
    }));
    await page.getByRole("tab", { name: /^Comentários/ }).click();
    await page.getByLabel("Seu comentário").fill("Comentário de teste");
    await page.getByRole("button", { name: "Enviar comentário" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Falha controlada" })).toBeVisible();
    await page.unroute("**/projects/" + id + "/comments");
    await page.getByRole("button", { name: "Enviar comentário" }).click();
    await expect(page.locator("article").filter({ hasText: "Comentário de teste" })).toBeVisible();
    await page.getByRole("button", { name: /^Curtir/ }).click();
    await expect(page.getByRole("button", { name: /^Descurtir/ })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: "../docs/thiago/projeto-editado-" + info.project.name + ".png", fullPage: true });
    // Libera os uploads próprios do teste antes da exclusão pela interface.
    const current = await (await page.request.get(api + "/projects/" + id)).json();
    await page.request.patch(api + "/projects/" + id, { headers, data: { cover_url: null, logo_url: null } });
    for (const url of [current.cover_url, current.logo_url].filter(Boolean)) await page.request.delete(api + url, { headers });
    await page.getByRole("button", { name: "Gerenciar", exact: true }).click();
    await page.getByRole("menuitem", { name: "Excluir projeto", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir projeto", exact: true }).click();
    await expect(page).toHaveURL(/\/projetos$/);
    expect((await page.request.get(api + "/projects/" + id)).status()).toBe(404);
    id = null;
  } finally {
    if (id !== null) await page.request.delete(api + "/projects/" + id, { headers });
    await page.request.post(api + "/auth/logout", { headers });
  }
});
