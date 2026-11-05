import { test, expect } from "@playwright/test";

const api = process.env.E2E_API_URL ?? "http://localhost:8000";
if (!["localhost", "127.0.0.1"].includes(new URL(api).hostname)) throw new Error("Somente ambiente local");

test("nomes e avatares abrem perfis no feed, comentários, equipes e chat", async ({ page }) => {
  const login = await page.request.post(api + "/auth/login", {
    headers: { Origin: "http://localhost:3000", "X-CSRF-Protection": "1" },
    data: { email: "e2e_alice@example.com", password: process.env.E2E_CHAT_PASSWORD ?? "Capmar-E2E@123" },
  });
  expect(login.status()).toBe(200);
  const me = (await login.json()).user;
  const posts = await (await page.request.get(api + "/posts")).json();
  const post = posts.find((p: { user_id: number }) => p.user_id !== me.user_id);
  expect(post?.author).toBeTruthy();
  const label = "Ver perfil de @" + post.author.username;
  for (const index of [0, 1, 2]) {
    await page.goto("/feed");
    const links = page.getByRole("link", { name: label, exact: true });
    await expect(links.nth(index)).toHaveAttribute("href", "/usuario/" + post.user_id);
    await links.nth(index).click();
    await expect(page).toHaveURL((process.env.E2E_BASE_URL ?? "http://localhost:3000") + "/usuario/" + post.user_id);
    await expect(page.getByRole("button", { name: "Enviar mensagem", exact: true })).toBeVisible();
  }

  await page.goto("/projeto/1#comentarios");
  const comment = page.locator("article").filter({ has: page.getByRole("link", { name: /^Ver perfil de/ }) }).first();
  const avatar = comment.getByRole("link", { name: /^Ver perfil de/ }).first();
  const href = await avatar.getAttribute("href");
  expect(href).toMatch(/^\/usuario\/\d+$/);
  await avatar.click();
  await expect(page).toHaveURL((process.env.E2E_BASE_URL ?? "http://localhost:3000") + href);

  const team = await (await page.request.get(api + "/teams/1")).json();
  const member = team.members.find((u: { user_id: number }) => u.user_id !== me.user_id);
  expect(member).toBeTruthy();
  await page.goto("/equipe/1");
  const memberLinks = page.getByRole("link", { name: "Ver perfil de @" + member.username, exact: true });
  const photo = memberLinks.filter({ has: page.locator("img, .rounded-full") }).first();
  await photo.click();
  await expect(page).toHaveURL((process.env.E2E_BASE_URL ?? "http://localhost:3000") + "/usuario/" + member.user_id);
  await page.goto("/equipe/1");
  await memberLinks.last().click();
  await expect(page).toHaveURL((process.env.E2E_BASE_URL ?? "http://localhost:3000") + "/usuario/" + member.user_id);

  const people = await (await page.request.get(api + "/users?q=e2e_bob")).json();
  const recipient = people.find((u: { username: string }) => u.username === "e2e_bob");
  await page.goto("/usuario/" + recipient.user_id);
  await page.getByRole("button", { name: "Enviar mensagem", exact: true }).click();
  const room = page.getByRole("region", { name: "Conversa", exact: true });
  const person = room.getByRole("heading").getByRole("link");
  const target = await person.getAttribute("href");
  await person.click();
  await expect(page).toHaveURL((process.env.E2E_BASE_URL ?? "http://localhost:3000") + target);
});
