import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Control Intellectus - Sistema de Gestión",
  description: "Análisis avanzado de informes PDF y control de datos Excel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950`}>
        <div className="flex h-screen overflow-hidden text-zinc-200 font-sans selection:bg-blue-500/30">
          <Sidebar />
          <main className="flex-1 h-screen overflow-hidden relative bg-zinc-950">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
