import type { Metadata } from "next";
import DescobrirClient from "./DescobrirClient";

export const metadata: Metadata = {
  title: "Descobrir projetos",
  description: "Arraste para curtir ou passar: conheça os projetos de Maricá em segundos.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DescobrirClient />;
}
