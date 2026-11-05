import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { FeedbackProvider } from "@/app/_components/ui/feedback";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "CapMar · Projetos de Maricá", template: "%s · CapMar" },
  description: "Conheça projetos, criadores e iniciativas da comunidade de Maricá e apoie quem faz a cidade acontecer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} antialiased scroll-smooth`}>
      <body className="flex flex-col font-sans bg-background text-foreground">
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
