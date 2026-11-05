import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3001";
const api = process.env.E2E_API_URL ?? "http://localhost:8000";
function otp(delta=0) {
  const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits=[...process.env.E2E_ADMIN_SECRET!.replace(/=/g,"")].map(c=>alphabet.indexOf(c).toString(2).padStart(5,"0")).join("");
  const key=Buffer.from(bits.match(/.{8}/g)!.map(b=>parseInt(b,2)));
  const counter=Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)+delta));
  const digest=createHmac("sha1",key).update(counter).digest();
  return String((digest.readUInt32BE(digest[19]&15)&0x7fffffff)%1000000).padStart(6,"0");
}
test("paginação administrativa e retomada após exigência de confirmação", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Paginação administrativa coberta uma vez; layout tem cenários próprios nas três larguras");
  expect(process.env.E2E_ADMIN_SECRET).toBeTruthy();
  const response = await page.request.post(api+"/auth/login", { headers:{Origin:base,"X-CSRF-Protection":"1"},data:{email:process.env.E2E_ADMIN_EMAIL,password:process.env.E2E_ADMIN_PASSWORD,otp:otp(-1)} });
  expect(response.status()).toBe(200);
  await page.goto("/admin");
  const users=page.getByRole("table",{name:"Gestão de usuários",exact:true});
  await expect(users.getByRole("row")).toHaveCount(21);
  const initial=await users.locator("tbody tr td:first-child").allTextContents();
  const pages=page.getByRole("navigation",{name:"Paginação administrativa",exact:true});
  await pages.getByRole("button",{name:"Próxima"}).click();
  await expect(page.getByText(/registros · página 2/)).toBeVisible();
  await expect(users.getByRole("row")).toHaveCount(21);
  expect((await users.locator("tbody tr td:first-child").allTextContents()).every(x=>!initial.includes(x))).toBe(true);
  await pages.getByRole("button",{name:"Anterior"}).click();
  await expect(page.getByText(/registros · página 1/)).toBeVisible();
  await page.getByRole("tab",{name:"Moderação",exact:true}).click();
  const posts=page.getByRole("table",{name:"Moderação de publicações",exact:true});
  await expect(posts.getByRole("row")).toHaveCount(21);
  await pages.getByRole("button",{name:"Próxima"}).click();
  await expect(page.getByText(/registros · página 2/)).toBeVisible();
  await page.route("**/admin/users?*",r=>r.fulfill({status:403,contentType:"application/json",body:JSON.stringify({detail:"Confirme sua identidade para continuar"})}));
  await page.getByRole("tab",{name:"Usuários",exact:true}).click();
  await expect(page.getByRole("alert").filter({hasText:"Confirme sua identidade"})).toBeVisible();
  await page.unroute("**/admin/users?*");
  await page.locator("summary").click();
  const form=page.getByRole("form",{name:"Confirmar identidade",exact:true});
  await form.getByLabel("Senha atual",{exact:true}).fill(process.env.E2E_ADMIN_PASSWORD!);
  await form.getByLabel("Código do autenticador",{exact:true}).fill(otp());
  await form.getByRole("button",{name:"Confirmar identidade",exact:true}).click();
  await expect(page.getByRole("status").filter({hasText:"Identidade confirmada"})).toBeVisible();
  await expect(users).toBeVisible();
});

test("PDF protegido é recusado e formulário continua utilizável",async({page})=>{
  expect((await page.request.post(api+"/auth/login",{headers:{Origin:base,"X-CSRF-Protection":"1"},data:{email:"qacov_1105_00@example.com",password:"Capmar-Cobertura@123"}})).status()).toBe(200);
  await page.goto("/projetos"); await page.getByRole("button",{name:"Novo projeto",exact:true}).click();
  const form=page.getByRole("form",{name:"Cadastrar projeto"});
  await form.getByLabel("Tipo de material").selectOption("pdf");
  await form.getByLabel("Arquivo do portfólio").setInputFiles("../docs/thiago/qa-protected.pdf");
  await expect(form.getByRole("alert")).toContainText(/PDF|senha/);
  await expect(form.getByRole("button",{name:"Cancelar",exact:true})).toBeEnabled();
});
