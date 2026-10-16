"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/context/LanguageContext";
import "./globals.css";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  const [isProductionUser, setIsProductionUser] = useState<boolean | null>(
    null,
  );
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkUserAccess() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setIsProductionUser(false);
          setCheckingAuth(false);
          return;
        }

        const { data: userData, error: dbError } = await supabase
          .from("users")
          .select("is_production_user")
          .eq("id", user.id)
          .single();

        if (dbError || !userData) {
          setIsProductionUser(false);
        } else {
          setIsProductionUser(!!userData.is_production_user);
        }
      } catch (err) {
        console.error("Eroare la verificarea utilizatorului:", err);
        setIsProductionUser(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkUserAccess();
  }, []);

  useEffect(() => {
    if (checkingAuth || !isProductionUser) return;

    const isWeeklyMaintenance = pathname === "/weekly-maintenance";
    const isApprovalPage = pathname.startsWith("/approval/");

    if (!isWeeklyMaintenance && !isApprovalPage) {
      router.push("/weekly-maintenance");
    }
  }, [isProductionUser, pathname, checkingAuth, router]);

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
      <body className="min-h-screen w-full flex bg-gray-50 text-slate-900 overflow-x-hidden antialiased">
        <Toaster position="top-right" reverseOrder={false} />

        <LanguageProvider>
          {checkingAuth ? (
            /* Structura de încărcare este mutată în interiorul body-ului nativ deja randat */
            <div className="flex-1 flex items-center justify-center bg-gray-50 text-slate-500 text-sm font-semibold min-h-screen w-full">
              Se încarcă configurația...
            </div>
          ) : (
            <>
              {/* Afișare condiționată Sidebar */}
              {!isProductionUser && <Sidebar />}

              {/* Ajustare dinamică Main Layout */}
              <main
                className={
                  isProductionUser
                    ? "w-full p-0 flex-1 min-w-0 min-h-screen bg-slate-50"
                    : "flex-1 w-full min-w-0 p-4 md:p-8 overflow-x-auto"
                }
              >
                {children}
              </main>
            </>
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}
