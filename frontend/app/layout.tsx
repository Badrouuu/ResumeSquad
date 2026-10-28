import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeSquad AI — Multi-Agent ATS Optimizer",
  description: "Plateforme multi-agents pour le tailoring de CV et le ciblage d'offres techniques",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased min-h-screen bg-[#09090b] text-[#f4f4f5]">
        {children}
      </body>
    </html>
  );
}
