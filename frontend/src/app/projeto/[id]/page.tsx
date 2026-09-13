import type { Metadata } from "next";
import { publicProject, siteUrl } from "@/lib/public-project";
import ProjetoClient from "./ProjetoClient";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = await publicProject(id);
  if (!project) return { title: "Projeto indisponível | CapMar", description: "Entre para verificar seu acesso ao projeto.", robots: { index: false, follow: false }, openGraph: null, twitter: null };
  const title = project.name + " | CapMar";
  const description = (project.description || "Conheça este projeto da comunidade de Maricá.").slice(0, 160);
  const url = new URL("/projeto/" + id, siteUrl).href;
  const image = url + "/preview";
  return { title, description, alternates: { canonical: url }, robots: { index: true, follow: true },
    openGraph: { title, description, url, siteName: "CapMar", type: "article", locale: "pt_BR", images: [{ url: image, width: 1200, height: 630, alt: project.name }] },
    twitter: { card: "summary_large_image", title, description, images: [image] } };
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  const project = await publicProject(id);
  return <ProjetoClient key={id} initialProject={project} />;
}
