import { Suspense } from "react";
import PublicFrame from "@/app/_components/PublicFrame";
import ProjectBrowser from "@/app/_components/ProjectBrowser";
import CommunityCTA from "@/app/_components/CommunityCTA";
import { ProjectGridSkeleton } from "@/app/_components/ui/primitives";

export default function PublicHomePage(){
 return <PublicFrame>
  <div className="ui-page-heading !mb-2"><div><h1>Projetos feitos em Maricá</h1><p>Conheça as iniciativas da cidade, veja quem está por trás de cada uma e descubra como participar.</p></div></div>
  <Suspense fallback={<ProjectGridSkeleton />}><ProjectBrowser publicOnly/></Suspense>
  <div className="pt-6"><CommunityCTA/></div>
 </PublicFrame>;
}
