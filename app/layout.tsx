import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ToolShop Pro",
  description: "Sistem de management operational pentru service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* h-screen blochează corpul la înălțimea ecranului, overflow-hidden oprește scroll-ul global */}
      <body className="h-screen w-screen flex bg-gray-50 text-slate-900 overflow-hidden">
        {/* Sidebar-ul fix în stânga */}
        <Sidebar />
        
        {/* Doar zona din dreapta va prelua derularea paginilor (overflow-y-auto) */}
        <main className="flex-1 h-full p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
