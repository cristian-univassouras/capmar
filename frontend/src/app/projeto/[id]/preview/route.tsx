import { ImageResponse } from "next/og";
import { publicProject } from "@/lib/public-project";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const project = await publicProject((await params).id);
  if (!project) return new Response("Imagem indisponível", { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#f6f1e7", color: "#0e2f3c", padding: 70, justifyContent: "center", gap: 30 }}>
    <div style={{ fontSize: 32 }}>CapMar · Projetos de Maricá</div>
    <div style={{ fontSize: 62, fontWeight: 700 }}>{project.name}</div>
    <div style={{ fontSize: 28 }}>{(project.description || "Conheça este projeto e seus responsáveis.").slice(0, 160)}</div>
  </div>, { width: 1200, height: 630, headers: { "Cache-Control": "no-store, max-age=0" } });
}
