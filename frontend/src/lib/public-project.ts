import "server-only";
import { cache } from "react";
import type { Project } from "./api";

export const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const backend = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
export const publicProject = cache(async (id: string): Promise<Project | null> => {
  if (!/^\d{1,10}$/.test(id)) return null;
  // Nunca encaminha cookies/Authorization. Cache desabilitado inclusive após mudança de visibilidade.
  const response = await fetch(backend + "/projects/" + id, { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(5000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Não foi possível consultar a vitrine pública");
  const project = await response.json() as Project;
  return project.visibility ? project : null;
});
