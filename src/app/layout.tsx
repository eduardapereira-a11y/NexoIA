import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PWAClient } from "@/components/pwa-client";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexoIA - Inteligência Artificial",
  description: "Um assistente inteligente (e desbocado) alimentado por Gemini.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NexoIA",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#8A2BE2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <PWAClient>
          {children}
        </PWAClient>
      </body>
    </html>
  );
}
