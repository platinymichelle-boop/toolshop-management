"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
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

  const [isProductionUser, setIsProductionUser] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Verificăm instant dacă utilizatorul accesează un link de aprobare trimis pe email
  const isApprovalPage = pathname.startsWith("/approval/");

  useEffect(() => {
    async function verifyUserAccess() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user || !user.email) {
          setIsProductionUser(false);
          setCheckingAuth(false);
          return;
        }

        const { data: userData, error: dbError } = await supabase
          .from("users")
          .select("is_production_user")
          .eq("email", user.email)
          .maybeSingle();

        if (dbError || !userData) {
          setIsProductionUser(false);
        } else {
          setIsProductionUser(!!userData.is_production_user);
        }
      } catch (err) {
        console.error("Eroare la verificarea accesului:", err);
        setIsProductionUser(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    verifyUserAccess();
  }, [pathname]);

  // Logica de redirecționare automată: utilizatorii de producție sunt ținuți doar pe zonele lor permise
  useEffect(() => {
    if (checkingAuth || !isProductionUser) return;

    const isWeeklyMaintenance = pathname === "/weekly-maintenance";

    if (!isWeeklyMaintenance && !isApprovalPage) {
      router.push("/weekly-maintenance");
    }
  }, [isProductionUser, pathname, checkingAuth, router, isApprovalPage]);

  // Funcția de deconectare completă
  async function handleGlobalSignOut() {
    if (!confirm("Sigur dorești să te deconectezi?")) return;

    try {
      localStorage.clear();
      sessionStorage.clear();

      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    }

    setIsProductionUser(false);
    setCheckingAuth(true);
    window.location.replace("/");
  }

  // Stabilim dacă ascundem Sidebar-ul: îl ascundem dacă e utilizator de producție SAU dacă suntem pe o pagină de aprobare publică
  const shouldHideSidebar = isProductionUser || isApprovalPage;

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
      <body className="min-h-screen w-full flex flex-col bg-gray-50 text-slate-900 overflow-x-hidden antialiased">
        <Toaster position="top-right" reverseOrder={false} />

        <LanguageProvider>
          {checkingAuth ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50 text-slate-500 text-sm font-semibold min-h-screen w-full">
              Se încarcă configurația...
            </div>
          ) : (
            <div className="flex-1 w-full flex min-h-screen">
              {/* Sidebar-ul se ascunde complet dacă ar trebui ascuns */}
              {!shouldHideSidebar && <Sidebar />}

              <div className="flex-1 flex flex-col min-w-0 w-full">
                {/* 
                  [LOGICĂ MODIFICATĂ] 
                  Antetul utiliar se randează doar pentru utilizatorii de producție 
                  și DOAR dacă NU se află pe pagina dedicată aprobărilor trimise pe email.
                */}
                {shouldHideSidebar && !isApprovalPage && (
                  <header className="w-full bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-md shrink-0 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚙️</span>
                      <span className="font-bold text-sm tracking-wide uppercase text-slate-200">
                        Metal Stamping Operational Area
                      </span>
                    </div>
                    <button
                      onClick={handleGlobalSignOut}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      🚪 Deconectare Cont
                    </button>
                  </header>
                )}

                {/* Main-ul se extinde acum pe tot ecranul, eliminând padding-ul când Sidebar-ul este ascuns */}
                <main
                  className={
                    shouldHideSidebar
                      ? "w-full p-0 flex-1 min-h-0 bg-slate-50 overflow-y-auto"
                      : "flex-1 w-full min-w-0 p-4 md:p-8 overflow-x-auto"
                  }
                >
                  {children}
                </main>
              </div>
            </div>
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}
