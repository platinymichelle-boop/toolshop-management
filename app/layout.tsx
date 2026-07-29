import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/context/LanguageContext";
import "./globals.css";
// Importăm componenta pentru notificări push-up locale
import { Toaster } from 'react-hot-toast';

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
  manifest: "/manifest.json", // Declarăm manifestul PWA pentru telefoane
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
      <head>
        {/* Optimizări native pentru iOS și Android */}
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
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
