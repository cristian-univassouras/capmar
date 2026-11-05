import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { createHmac } from "node:crypto";
const f=JSON.parse(readFileSync("../docs/thiago/coverage-fixtures.json","utf8"));
const phase=process.env.VISUAL_PHASE;
if(!["antes","depois"].includes(phase??""))throw Error("Defina VISUAL_PHASE=antes ou depois");
test("inventário visual comparável",async({page},info)=>{
  const dir="../docs/thiago/comparativo-visual/"+phase+"/"+info.project.name;
  mkdirSync(dir,{recursive:true});
  const capture=async(name:string)=>{
    await page.locator("main").first().waitFor({state:"visible"});
    await expect(page.getByText(/^(Carregando|Consultando)/)).toHaveCount(0);
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(850); // Animação de entrada da marca deve terminar antes da captura.
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:dir+"/"+name+".png",fullPage:true,animations:"disabled"});
  };
  for(const [name,url] of [["inicial","/"],["explorar","/home"],["sobre","/sobre"],["ajuda","/ajuda"],["login","/login"],["cadastro","/register"],["recuperar","/esqueci-senha"],["redefinir","/redefinir-senha"],["perfil-publico","/usuario/"+f.owner],["projeto-publico","/projeto/"+f.projects[0]]]){
    await page.goto(url);await capture(name);
  }
  expect((await page.request.post("http://localhost:8000/auth/login",{headers:{Origin:"http://localhost:3001","X-CSRF-Protection":"1"},data:{email:f.prefix+"_00@example.com",password:"Capmar-Cobertura@123"}})).status()).toBe(200);
  for(const [name,url] of [["feed","/feed"],["perfil","/perfil"],["projetos","/projetos"],["equipes","/equipes"],["equipe","/equipe/1"],["seguranca","/seguranca"],["chat","/chat"],["chat-aberto","/chat?conversation="+f.conversation]]){
    await page.goto(url);if(name==="chat")await page.getByRole("button",{name:/@qacov_1105_34/}).waitFor({state:"visible"}); if(name==="chat-aberto")await page.getByRole("region",{name:"Conversa",exact:true}).waitFor({state:"visible"});
    if(name==="feed")await page.getByRole("button",{name:"Publicar",exact:true}).waitFor({state:"visible"});
    await capture(name);
  }
  await page.goto("/projetos");await page.getByRole("button",{name:"Novo projeto",exact:true}).click();await page.getByRole("form",{name:"Cadastrar projeto"}).waitFor({state:"visible"});await capture("formulario-projeto");
  await page.goto("/perfil");await page.getByRole("button",{name:"Editar perfil",exact:true}).click();await capture("editar-perfil");
});

test("inventário administrativo",async({page},info)=>{
  const a=JSON.parse(readFileSync("../docs/thiago/acesso-admin-local.json","utf8"));
  const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits=[...String(a.totp_secret).replace(/=/g,"")].map(c=>alphabet.indexOf(c).toString(2).padStart(5,"0")).join("");
  const key=Buffer.from(bits.match(/.{8}/g)!.map(b=>parseInt(b,2)));
  if(!existsSync("../docs/thiago/comparativo-visual/"+phase+"-admin-session.json"))await page.waitForTimeout(31000-(Date.now()%30000));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const digest=createHmac("sha1",key).update(counter).digest();
  const code=String((digest.readUInt32BE(digest[19]&15)&0x7fffffff)%1000000).padStart(6,"0");
  const sessionFile="../docs/thiago/comparativo-visual/"+phase+"-admin-session.json";
  if(existsSync(sessionFile)) await page.context().addCookies(JSON.parse(readFileSync(sessionFile,"utf8")).cookies);
  else {
    expect((await page.request.post("http://localhost:8000/auth/login",{headers:{Origin:"http://localhost:3001","X-CSRF-Protection":"1"},data:{email:a.email,password:a.password,otp:code}})).status()).toBe(200);
    await page.context().storageState({path:sessionFile});
  }
  const dir="../docs/thiago/comparativo-visual/"+phase+"/"+info.project.name;mkdirSync(dir,{recursive:true});
  await page.goto("/admin");await expect(page.getByRole("table",{name:"Gestão de usuários",exact:true})).toBeVisible();
  for(const[name,button]of[["admin-usuarios","Usuários"],["admin-moderacao","Moderação"],["admin-auditoria","Auditoria"]]){
    await page.getByRole("button",{name:button,exact:true}).click();await expect(page.getByRole("table")).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:dir+"/"+name+".png",fullPage:true,animations:"disabled"});
  }
});
