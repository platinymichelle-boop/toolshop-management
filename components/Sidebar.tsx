"use client";

import { useState } from "react";
import { useSidebarAuth } from "@/lib/useSidebarAuth";
import SidebarMenu from "./SidebarMenu";

export default function Sidebar() {
  const { permissions, userEmail, isLoading, pathname, handleLogout } = useSidebarAuth();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Butonul de Hamburger fix - vizibil DOAR pe mobil (lg:hidden) */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-lg"
      >
        {isOpen ? "✕" : "☰"}
      </button>

      {/* Fundal întunecat (Overlay) când meniul e deschis pe mobil */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Structura Sidebar-ului adaptivă pentru mobil și desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-950 border-r border-slate-800 
        flex flex-col justify-between h-full text-slate-300 shadow-xl shrink-0
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-0 -left-64 lg:left-0"}
      `}>
        
        <div>
          {/* Logo-ul Companiei */}
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-2">
            <span className="text-xl bg-indigo-600 text-white p-1.5 rounded-xl shadow-md font-bold">⚙️</span>
            <div>
              <h1 className="text-base font-black text-white tracking-tight">ToolShop Pro</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enterprise OS</p>
            </div>
          </div>

          {/* Zona de Meniu Securizat */}
          <nav className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-9 bg-slate-800 rounded-xl"></div>
                <div className="h-9 bg-slate-800 rounded-xl"></div>
                <div className="h-9 bg-slate-800 rounded-xl"></div>
              </div>
            ) : (
              // Apelăm componenta de meniu separată la pasul 2
              <SidebarMenu permissions={permissions} pathname={pathname} />
            )}
          </nav>
        </div>

        {/* Zona de Jos: Profil Utilizator și Deconectare */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/40">
          {userEmail && (
            <div className="mb-3 px-2 flex flex-col">
              <span className="text-xs font-semibold text-slate-200 truncate">{userEmail}</span>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-0.5">
                {permissions?.role || "user"}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors border border-rose-500/20"
          >
            <span>🚪</span> Deconectare
          </button>
        </div>

      </aside>
    </>
  );
}
