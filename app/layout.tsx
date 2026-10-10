import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/context/LanguageContext";
import "./globals.css";
// Importăm componenta pentru notificări push-up locale
import { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <head>
        {/* Optimizări native pentru viewport adaptiv și ecrane mobile */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
        />
        <meta name="theme-color" content="#0f172a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      {/* 
        [MODIFICARE FIZICĂ ECOSYSTEM MOBIL]
        - Înlocuit h-screen/w-screen rigid cu min-h-screen și w-full pentru scalare flexibilă.
        - Eliminat overflow-hidden global de pe body pentru a permite gesturile native ale sistemului de operare.
      */}
      <body className="min-h-screen w-full flex bg-gray-50 text-slate-900 overflow-x-hidden antialiased">
        {/* Containerul global pentru ferestrele pop-up de interfață */}
        <Toaster position="top-right" reverseOrder={false} />

        {/* Providerul de limbă global în jurul întregii structuri */}
        <LanguageProvider>
          {/* Sidebar-ul fix în stânga */}
          <Sidebar />

          {/* 
            [MODIFICARE ANTIDOT TĂIERE DREAPTA]
            - Schimbat p-8 fix (excesiv pe mobil) în p-4 pe ecrane mici și md:p-8 pe desktop.
            - Înlocuit h-full rigid cu flex-1 pentru a lăsa conținutul să respire pe verticală.
            - Adăugat w-full și min-w-0 pentru a forța tabelele interne (flex-item) să recunoască marginile ecranului și să își activeze propriul scroll orizontal.
          */}
          <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-x-auto">
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}
