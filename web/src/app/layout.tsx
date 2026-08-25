import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VGRM Trade Marketing",
  description: "Gestão de rotas, visitas e trade marketing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
