import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture=JSON.parse(readFileSync("../docs/thiago/coverage-fixtures.json","utf8"));
test("Vimeo real carrega controles e mantém alternativa em erro do provedor",async({page},info)=>{
  test.skip(info.project.name!=="desktop","Provedor real verificado uma vez; layout coberto separadamente");
  const errors:string[]=[];page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
  await page.goto("/projeto/"+fixture.projects[0]);
  await page.getByRole("button",{name:/Reproduzir Exemplo Vimeo oficial/}).click();
  await expect(page.locator("iframe")).toHaveAttribute("src","https://player.vimeo.com/video/76979871?h=8272103f6e");
  try {
    const play=page.frameLocator("iframe").getByRole("button",{name:/^Reproduzir$|^Play$/}).first();
    await expect(play).toBeVisible({timeout:20000});
    await play.click();
    const frame=page.frameLocator("iframe");
    await expect.poll(async()=>{
      if(await frame.getByRole("heading",{name:/Não foi possível reproduzir o vídeo/}).count())return "codec";
      const state=await frame.locator("video").first().evaluate((v:HTMLVideoElement)=>({time:v.currentTime,paused:v.paused})).catch(()=>null);
      return state && !state.paused && state.time>0 ? "playing" : "waiting";
    },{timeout:20000}).toMatch(/codec|playing/);
    if(await frame.getByRole("heading",{name:/Não foi possível reproduzir o vídeo/}).count()) info.annotations.push({type:"limitação externa",description:"Vimeo informou navegador/codec não suportado; alternativa externa permanece disponível."});

  } finally {
    await info.attach("console-player",{body:errors.join("\n"),contentType:"text/plain"});
    await page.screenshot({path:"../docs/thiago/vimeo-real.png",fullPage:false,timeout:5000});
  }
  await expect(page.getByRole("link",{name:"Abrir vídeo no provedor ↗",exact:true})).toHaveAttribute("href","https://vimeo.com/76979871/8272103f6e");
});
