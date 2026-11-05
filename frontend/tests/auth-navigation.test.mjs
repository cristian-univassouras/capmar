import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const code = ts.transpileModule(readFileSync(new URL("../src/lib/auth-navigation.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { safeAuthDestination } = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
test("retorno preserva projeto/equipe/chat e rejeita origens e parâmetros arbitrários", () => {
  for (const path of ["/projeto/60", "/usuario/8", "/equipe/22", "/chat?team=22", "/chat?conversation=92"]) assert.equal(safeAuthDestination(path), path);
  for (const path of [null, "https://evil.example", "//evil.example", "/chat?next=https://evil.example", "/projeto/1#x", "/feed?next=evil", "/chat?team=1&conversation=2"]) assert.equal(safeAuthDestination(path), null);
});
