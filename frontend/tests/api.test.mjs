import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// Compila somente o módulo sob teste com o TypeScript já instalado no projeto.
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const api = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
const values = new Map();
const user = { user_id: 1, username: "owner", email: "owner@example.com",
  first_name: null, last_name: null, avatar_url: null };
let calls;

beforeEach(() => {
  values.clear();
  calls = [];
  globalThis.window = new EventTarget();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ user });
  };
});

test("login usa cookie, cabeçalho CSRF e remove token legado", async () => {
  values.set("capmar_token", "old-token");
  const result = await api.login({ email: user.email, password: "password" });
  api.saveSession(result);
  assert.equal(calls[0].init.credentials, "include");
  assert.equal(calls[0].init.headers["X-CSRF-Protection"], "1");
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.equal(values.has("capmar_token"), false);
  assert.equal(JSON.parse(values.get("capmar_user")).user_id, 1);
});

test("upload multipart envia CSRF sem forçar Content-Type", async () => {
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ url: "/uploads/example" });
  };
  await api.uploadImage(new File(["pixels"], "photo.png", { type: "image/png" }));
  assert.equal(calls[0].init.headers["X-CSRF-Protection"], "1");
  assert.equal(calls[0].init.headers["Content-Type"], undefined);
  assert.equal(calls[0].init.credentials, "include");
});

test("logout aguarda servidor e mantém cache em falha de rede", async () => {
  api.saveUser(user);
  globalThis.fetch = async () => { throw new Error("offline"); };
  await assert.rejects(api.clearSession());
  assert.equal(values.has("capmar_user"), true);
  globalThis.fetch = async () => Response.json({ detail: "Sessão encerrada" });
  await api.clearSession();
  assert.equal(values.has("capmar_user"), false);
});

test("401 limpa cache, sinaliza expiração e preserva status do erro", async () => {
  api.saveUser(user);
  let expired = false;
  window.addEventListener("capmar-session-expired", () => { expired = true; });
  globalThis.fetch = async () => Response.json({ detail: "expired" }, { status: 401 });
  await assert.rejects(api.getMe(), (error) => error instanceof api.ApiError && error.status === 401);
  assert.equal(expired, true);
  assert.equal(values.has("capmar_user"), false);
});
