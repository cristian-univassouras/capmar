import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/format.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { formatDate } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
test("datas civis preservam dia e texto entre fusos do servidor e navegador", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Sao_Paulo", "Pacific/Auckland"]) {
      process.env.TZ = zone;
      assert.equal(formatDate("2026-11-04"), "04 de nov. de 2026");
      assert.equal(formatDate("2026-09-01"), "01 de set. de 2026");
    }
  } finally { if (previous) process.env.TZ = previous; else delete process.env.TZ; }
});
