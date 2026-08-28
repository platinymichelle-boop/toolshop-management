"use client";

import { useState, useEffect } from "react";
import { useSidebarAuth } from "@/lib/useSidebarAuth";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import LanguageToggle from "./LanguageToggle";
import SidebarMenu from "./SidebarMenu";
import {
  LayoutDashboard,
  Factory,
  Wrench,
  Package,
  Users,
  Lightbulb,
  AlertTriangle,
  BarChart3,
  FileBarChart2,
  Settings,
  PlusCircle,
  Cpu,
  Clock,
  ShieldAlert,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const { permissions, userEmail, isLoading, pathname, handleLogout } =
    useSidebarAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Stări pentru KPI-uri din Supabase
  const [kpis, setKpis] = useState({
    machinesCount: 0,
    openRepairs: 0,
    openBreakdowns: 0,
    lowStockParts: 0,
  });

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // 3. Încărcarea KPI-urilor din Supabase în timp real
  useEffect(() => {
    async function fetchSidebarKPIs() {
      try {
        const [toolsRes, repairsRes, breakdownsRes, partsRes] =
          await Promise.all([
            supabase.from("tools").select("id", { count: "exact", head: true }),
            supabase
              .from("repairs")
              .select("id", { count: "exact", head: true })
              .not("status", "ilike", "closed"),
            supabase
              .from("repairs")
              .select("id", { count: "exact", head: true })
              .ilike("status", "new"),
            supabase
              .from("spare_parts")
              .select("id", { count: "exact", head: true })
              .lte("stock_quantity", 2),
          ]);

        setKpis({
          machinesCount: toolsRes.count || 0,
          openRepairs: repairsRes.count || 0,
          openBreakdowns: breakdownsRes.count || 0,
          lowStockParts: partsRes.count || 0,
        });
      } catch (err) {
        console.error("Eroare la încărcarea KPI-urilor din sidebar:", err);
      }
    }
    fetchSidebarKPIs();
  }, [pathname]);

  const customLogout = async () => {
    if (!window.confirm(t.logoutConfirm)) return;
    await handleLogout();
  };

  // 1 & 2. Definirea structurii meniului enterprise corectată conform directoarelor app/
  const navigationSections = [
    {
      title: "OPERATIONS",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Equipments", href: "/tools", icon: Factory }, // Corectat din /tool în /tools
        { name: "Repairs", href: "/repairs", icon: Wrench },
        { name: "Breakdown Tracker", href: "/breakdown", icon: AlertTriangle }, // Corectat din /breakdown-tracker în /breakdown
      ],
    },
    {
      title: "MAINTENANCE",
      items: [
        { name: "Spare Parts", href: "/spare-parts", icon: Package },
        { name: "Technical Team", href: "/technicians", icon: Users }, // Corectat din /technical-team în /technicians
        { name: "Improvements", href: "/improvements", icon: Lightbulb },
      ],
    },
    {
      title: "ANALYTICS",
      items: [
        {
          name: "Breakdown Analytics",
          href: "/breakdown/dashboard",
          icon: BarChart3,
        }, // Corectat din /breakdown-analytics în /breakdown/dashboard
        { name: "Reports", href: "/reports", icon: FileBarChart2 },
      ],
    },
    {
      title: "ADMINISTRATION",
      items: [{ name: "Settings", href: "/admin/matrix", icon: Settings }], // Corectat pentru a mapa corect setările tale administrative
    },
  ];
  return (
    <>
      {/* Buton Hamburger: vizibil DOAR pe mobil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-lg focus:outline-none"
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
      <aside
        className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-950 border-r border-slate-800/80 
        flex flex-col justify-between h-full text-slate-300 shadow-2xl shrink-0
        transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo Brand */}
          <div className="p-5 border-b border-slate-800/60 flex items-center gap-2.5 bg-slate-950">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center">
              <Cpu className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight uppercase">
                Metal Stamping
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Enterprise CMS
              </p>
            </div>
          </div>

          {/* Panel de Indicatori KPI sub Logo */}
          <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800/40 grid grid-cols-2 gap-2">
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/50 flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Utilaje
              </span>
              <span className="text-xs font-black text-slate-200 mt-0.5">
                {kpis.machinesCount}
              </span>
            </div>
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/50 flex flex-col">
              <span className="text-[10px] font-bold text-amber-500 uppercase">
                Reparații
              </span>
              <span className="text-xs font-black text-amber-400 mt-0.5">
                {kpis.openRepairs}
              </span>
            </div>
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/50 flex flex-col">
              <span className="text-[10px] font-bold text-rose-500 uppercase">
                Avarii
              </span>
              <span className="text-xs font-black text-rose-400 mt-0.5">
                {kpis.openBreakdowns}
              </span>
            </div>
            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/50 flex flex-col">
              <span className="text-[10px] font-bold text-indigo-500 uppercase">
                Stoc Mic
              </span>
              <span className="text-xs font-black text-indigo-400 mt-0.5">
                {kpis.lowStockParts}
              </span>
            </div>
          </div>

          {/* Zona de Navigație Structurată */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-5">
            {isLoading ? (
              <div className="space-y-4 animate-pulse p-2">
                <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                <div className="h-8 bg-slate-800 rounded-lg"></div>
              </div>
            ) : (
              /* Meniul dinamic reconfigurat */
              <SidebarMenu permissions={permissions} pathname={pathname} />
            )}

            {/* Secțiunea Enterprise de Acțiuni Rapide (Quick Actions) */}
            <div className="pt-2 border-t border-slate-900/60 space-y-1.5">
              <h3 className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                QUICK ACTIONS
              </h3>
              <div className="px-2 space-y-1">
                <Link
                  href="/repairs?action=new"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800/60 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white transition-all"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span>New Repair</span>
                </Link>
                {/* Corectat link din /breakdown-tracker în /breakdown */}
                <Link
                  href="/breakdown?action=new"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800/60 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white transition-all"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  <span>New Breakdown</span>
                </Link>
                <Link
                  href="/spare-parts?action=add"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800/60 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white transition-all"
                >
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Add Spare Part</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Subsol Îmbunătățit (Footer) - Profil, Limbă și Versiune */}
        <div className="p-3 border-t border-slate-800/60 bg-slate-950/90 space-y-3 shrink-0">
          <LanguageToggle />

          {userEmail && (
            <div className="px-2 py-1.5 bg-slate-900/30 rounded-xl border border-slate-900/40 flex flex-col">
              <span className="text-xs font-bold text-slate-200 truncate">
                {userEmail.split("@")[0]}
              </span>
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mt-0.5">
                {permissions?.role || "Operator"}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              v2.4.0-PRO
            </span>
            <button
              onClick={customLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all border border-rose-500/10"
            >
              <LogOut className="h-3 w-3" />
              <span>{t.logout || "Logout"}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
