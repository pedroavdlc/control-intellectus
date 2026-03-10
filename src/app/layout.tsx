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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950`}>
        <div className="flex min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30">
          <Sidebar />
          <main className="flex-1 ml-64 h-screen overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/5 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" />
            <div className="p-8 h-full relative z-10 flex flex-col">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
