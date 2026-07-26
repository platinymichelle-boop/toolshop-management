"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

interface UserPermissions {
  role: string | null;
  can_view_repairs: boolean | null;
  can_view_tools: boolean | null;
  can_view_parts: boolean | null;
  can_view_reports: boolean | null;
}

export default function Sidebar() {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAccess() {
      try {
        setIsLoading(true);
        
        // 1. Preluăm sesiunea activă a utilizatorului logat
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
          // Dacă nu există sesiune activă, forțăm redirecționarea la Login
          if (pathname !== "/login") router.push("/login");
          return;
        }

        const email = session.user.email;
        setUserEmail(email || null);

        // 2. Interogăm tabela publică `users` după username (email) pentru a extrage bifele din Matrice
        const { data: userData, error } = await supabase
          .from("users")
          .select("role, can_view_repairs, can_view_tools, can_view_parts, can_view_reports")
          .eq("username", email)
          .maybeSingle();

        if (error) throw error;

        if (userData) {
          setPermissions(userData);
        }
      } catch (error: any) {
        console.error("Eroare la verificarea permisiunilor în Sidebar:", error.message);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [pathname, router]);

  // Funcția oficială de Deconectare (Logout) din Supabase
  async function handleLogout() {
    const confirmLogout = window.confirm("Sigur dorești să te deconectezi din sistem?");
    if (!confirmLogout) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Eroare la deconectare: " + error.message);
      return;
    }

    // Curățăm starea și trimitem utilizatorul înapoi la ecranul de Login
    setPermissions(null);
    setUserEmail(null);
    router.push("/login");
  }

  // Helper logic: Adminul vede tot; ceilalți văd doar dacă au bifa respectivă setată ca TRUE
  const isAdmin = permissions?.role === "admin";
  const showRepairs = isAdmin || permissions?.can_view_repairs === true;
  const showTools = isAdmin || permissions?.can_view_tools === true;
  const showParts = isAdmin || permissions?.can_view_parts === true;
  const showReports = isAdmin || permissions?.can_view_reports === true;
    return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between h-full text-slate-300 shadow-xl z-30 shrink-0">
      
      {/* Zona de Sus: Logo Companie cu tematică Dark */}
      <div>
        <div className="p-6 border-b border-slate-800/60 flex items-center gap-2">
          <span className="text-xl bg-indigo-600 text-white p-1.5 rounded-xl shadow-md font-bold">⚙️</span>
          <div>
            <h1 className="text-base font-black text-white tracking-tight">ToolShop Pro</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enterprise OS</p>
          </div>
        </div>

        {/* Zona Centrală: Meniul Securizat prin GPO */}
        <nav className="p-4">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-9 bg-slate-800 rounded-xl"></div>
              <div className="h-9 bg-slate-800 rounded-xl"></div>
              <div className="h-9 bg-slate-800 rounded-xl"></div>
            </div>
          ) : (
            <ul className="space-y-1">
              
              <li>
                <Link 
                  href="/dashboard" 
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    pathname === "/dashboard" 
                      ? "bg-indigo-600 text-white font-bold shadow-md" 
                      : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>🏠</span> Dashboard
                </Link>
              </li>

              {showRepairs && (
                <li>
                  <Link 
                    href="/repairs" 
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      pathname === "/repairs" 
                        ? "bg-indigo-600 text-white font-bold shadow-md" 
                        : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>🔧</span> Repairs
                  </Link>
                </li>
              )}

              {showTools && (
                <li>
                  <Link 
                    href="/tools" 
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      pathname === "/tools" 
                        ? "bg-indigo-600 text-white font-bold shadow-md" 
                        : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>🧰</span> Tools / Matrițe
                  </Link>
                </li>
              )}

              {showParts && (
                <li>
                  <Link 
                    href="/spare-parts" 
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      pathname === "/spare-parts" 
                        ? "bg-indigo-600 text-white font-bold shadow-md" 
                        : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>📦</span> Spare Parts
                  </Link>
                </li>
              )}

              {isAdmin && (
                <li>
                  <Link 
                    href="/technicians" 
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      pathname === "/technicians" 
                        ? "bg-indigo-600 text-white font-bold shadow-md" 
                        : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>🧑‍🔧</span> Technicians Team
                  </Link>
                </li>
              )}

              <li>
                <Link 
                  href="/improvements" 
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    pathname === "/improvements" 
                      ? "bg-indigo-600 text-white font-bold shadow-md" 
                      : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>💡</span> Improvements
                </Link>
              </li>

              {showReports && (
                <li>
                  <Link 
                    href="/reports" 
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      pathname === "/reports" 
                        ? "bg-indigo-600 text-white font-bold shadow-md" 
                        : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>📊</span> Reports
                  </Link>
                </li>
              )}

              {isAdmin && (
                <li className="pt-4 border-t border-slate-800/60 mt-4">
                  <Link 
                    href="/admin/matrix" 
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition-colors ${
                      pathname === "/admin/matrix" 
                        ? "bg-rose-600 text-white shadow-sm" 
                        : "hover:bg-slate-800/60 text-slate-500 hover:text-slate-300 uppercase tracking-wider"
                    }`}
                  >
                    <span>🛡️</span> GPO Access Matrix
                  </Link>
                </li>
              )}

            </ul>
          )}
        </nav>
      </div>

      {/* Zona de Jos: Profil Utilizator curent și Buton Logout */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-900/40 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
            {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="truncate max-w-[160px]">
            <p className="text-xs font-bold text-white truncate">{userEmail || "Utilizator"}</p>
            <p className="text-[10px] text-slate-400 font-bold truncate capitalize">
              {permissions?.role || "Operator"}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-950/40 hover:bg-rose-900/30 transition-colors cursor-pointer border border-rose-900/50"
        >
          <span>🚪</span> Deconectare Cont
        </button>
      </div>

    </aside>
  );
}
