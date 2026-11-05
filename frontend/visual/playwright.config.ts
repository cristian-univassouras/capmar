import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "capture.spec.ts", workers:1, timeout:120000,
  outputDir:"../../docs/thiago/comparativo-visual/resultados", reporter:"list",
  use:{baseURL:"http://localhost:3001",channel:"chrome",locale:"pt-BR"},
  projects:[{name:"desktop",use:{viewport:{width:1440,height:1000}}},{name:"mobile-390",use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},{name:"mobile-320",use:{viewport:{width:320,height:740},isMobile:true,hasTouch:true}}]
});
