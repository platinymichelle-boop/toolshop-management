"use client";

import { useState, useEffect } from "react";
import { useSidebarAuth } from "@/lib/useSidebarAuth";
import { useLanguage } from "@/context/LanguageContext";
import SidebarMenu from "./SidebarMenu";
import LanguageToggle from "./LanguageToggle";


export default function Sidebar() {
  const { permissions, userEmail, isLoading, pathname, handleLogout } = useSidebarAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const customLogout = async () => {
    if (!window.confirm(t.logoutConfirm)) return;
    await handleLogout();
  };

  return (
    <>
      {/* Buton Hamburger: vizibil DOAR pe mobil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {isOpen ? "✕" : "☰"}
      </button>

      {/* Fundal întunecat (Overlay) pe mobil */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm transition-opacity" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Structura principală Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-950 border-r border-slate-800 
        flex flex-col justify-between h-full text-slate-300 shadow-xl shrink-0
        transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-2">
            <span className="text-xl bg-indigo-600 text-white p-1.5 rounded-xl shadow-md font-bold">⚙️</span>
            <div>
              <h1 className="text-base font-black text-white tracking-tight">ToolShop Pro</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enterprise OS</p>
            </div>
          </div>

          {/* Navigație dinamică */}
          <nav className="p-4 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-9 bg-slate-800 rounded-xl"></div>
                <div className="h-9 bg-slate-800 rounded-xl"></div>
              </div>
            ) : (
              <SidebarMenu permissions={permissions} pathname={pathname} />
            )}
          </nav>
        </div>

        {/* Panou Configurare Limbă și Profil în partea de jos */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 space-y-4">
          <LanguageToggle />

          {userEmail && (
            <div className="px-2 flex flex-col">
              <span className="text-xs font-semibold text-slate-200 truncate">{userEmail}</span>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-0.5">
                {permissions?.role || "user"}
              </span>
            </div>
          )}
          
          <button
            onClick={customLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors border border-rose-500/20"
          >
            <span>🚪</span> {t.logout}
          </button>
        </div>
      </aside>
    </>
  );
}
