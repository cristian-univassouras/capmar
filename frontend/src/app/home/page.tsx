import { Suspense } from "react";
import PublicFrame from "@/app/_components/PublicFrame";
import ProjectBrowser from "@/app/_components/ProjectBrowser";
import CommunityCTA from "@/app/_components/CommunityCTA";
export default function PublicHomePage(){
 return <PublicFrame><div className="ui-page-heading"><div><span className="ui-eyebrow">Ideias que fazem a cidade acontecer</span><h1 className="mt-3">Projetos feitos em Maricá.</h1><p>Encontre iniciativas locais, conheça quem está por trás delas e descubra como participar.</p></div></div><Suspense fallback={<p role="status">Carregando vitrine...</p>}><ProjectBrowser publicOnly/></Suspense><CommunityCTA/></PublicFrame>;
}
