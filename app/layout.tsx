import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/context/LanguageContext";
import "./globals.css";
// Importăm componenta pentru notificări push-up locale
import { Toaster } from 'react-hot-toast';
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Metal Stamping Maintenance",
  description: "Sistem de management operational pentru service",
  // Next.js va injecta automat ruta manifestului din app/manifest.ts
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <head>
        {/* Optimizări native pentru iOS și Android */}
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-screen w-screen flex bg-gray-50 text-slate-900 overflow-hidden">
        {/* Containerul global pentru ferestrele pop-up de interfață */}
        <Toaster position="top-right" reverseOrder={false} />

        {/* Providerul de limbă global în jurul întregii structuri */}
        <LanguageProvider>
          {/* Sidebar-ul fix în stânga */}
          <Sidebar />
          
          {/* Zona din dreapta preia derularea paginilor */}
          <main className="flex-1 h-full p-8 overflow-y-auto">
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}
