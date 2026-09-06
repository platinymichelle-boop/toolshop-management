"use client";

import { useState, useEffect } from "react";
import { useSidebarAuth } from "@/lib/useSidebarAuth";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import LanguageToggle from "./LanguageToggle";
import {
  LayoutDashboard,
  Factory,
  Wrench,
  AlertTriangle,
  Package,
  Users,
  Lightbulb,
  BarChart3,
  FileBarChart2,
  Settings,
  PlusCircle,
  Cpu,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ClipboardCheck,
  History,
  Droplets,
  KeyRound,
  Wallet, // Importat pentru o pictogramă dedicată Budget Planner
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

  // Încărcarea KPI-urilor în timp real
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
    if (!window.confirm(t?.logoutConfirm || "Sigur doriți să vă deconectați?"))
      return;
    await handleLogout();
  };

  // Structura meniului actualizată complet cu toate paginile din proiect
  const navigationSections = [
    {
      title: "Operations",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Factory Monitor", href: "/live-factory", icon: Factory },
        {
          name: "Customer Claims",
          href: "/customer-claims",
          icon: ClipboardCheck,
        },
        {
          name: "Equipments",
          href: "/tools",
          icon: Factory,
          badge: kpis.machinesCount,
          badgeType: "neutral",
        },
        {
          name: "Repairs",
          href: "/repairs",
          icon: Wrench,
          badge: kpis.openRepairs,
          badgeType: "warning",
        },
        {
          name: "Breakdown Tracker",
          href: "/breakdown",
          icon: AlertTriangle,
          badge: kpis.openBreakdowns,
          badgeType: "danger",
        },
      ],
    },
    {
      title: "Maintenance",
      items: [
        {
          name: "Spare Parts",
          href: "/spare-parts",
          icon: Package,
          badge: kpis.lowStockParts > 0 ? kpis.lowStockParts : null,
          badgeType: "danger",
        },
        {
          name: "Preventive Maintenance",
          href: "/preventive-maintenance",
          icon: Wrench,
        },
        { name: "PM History", href: "/pm-history", icon: History },
        { name: "Technical Team", href: "/technicians", icon: Users },
        { name: "Improvements", href: "/improvements", icon: Lightbulb },
        { name: "Fluid Management", href: "/fluid-management", icon: Droplets },
        { name: "Budget Planner", href: "/budget-planner", icon: Wallet },
      ],
    },
    {
      title: "Analytics",
      items: [
        {
          name: "Breakdown Analytics",
          href: "/breakdown/dashboard",
          icon: BarChart3,
        },
        { name: "Reports", href: "/reports", icon: FileBarChart2 },
      ],
    },
    {
      title: "Administration",
      items: [
        { name: "Settings", href: "/admin/matrix", icon: Settings },
        {
          name: "Access Management",
          href: "/access-management",
          icon: KeyRound,
        },
      ],
    },
  ];
  return (
    <>
      {/* Buton Hamburger pe Mobil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-200 shadow-xl active:scale-95 transition-transform"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {/* Overlay Mobil */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Principal */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-900
          flex flex-col justify-between h-full text-slate-400 shadow-2xl shrink-0
          transition-transform duration-300 ease-in-out lg:sticky lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-900 flex items-center gap-3 bg-slate-950/50 backdrop-blur-md">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
                Metal Stamping
              </h1>
              <p className="text-[10px] text-indigo-400/80 font-semibold tracking-widest uppercase">
                Enterprise CMS
              </p>
            </div>
          </div>

          {/* Zona Scrollabilă de Navigație */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7 scrollbar-thin scrollbar-thumb-slate-800">
            {isLoading ? (
              <div className="space-y-6 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 bg-slate-900 rounded w-1/4 mb-3"></div>
                    <div className="h-9 bg-slate-900 rounded-lg w-full"></div>
                    <div className="h-9 bg-slate-900 rounded-lg w-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              // Randerare Secțiuni Meniu
              <nav className="space-y-7">
                {navigationSections.map((section) => (
                  <div key={section.title} className="space-y-1.5">
                    <h3 className="px-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                      {section.title}
                    </h3>
                    <ul className="space-y-1">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              className={`
                                group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
                                ${
                                  isActive
                                    ? "bg-gradient-to-r from-slate-900 to-slate-900/50 border border-slate-800 text-indigo-400 font-semibold shadow-inner"
                                    : "hover:bg-slate-900/50 hover:text-slate-200 text-slate-400 border border-transparent"
                                }
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon
                                  className={`h-4 w-4 transition-transform group-hover:scale-110 duration-200 ${isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300"}`}
                                />
                                <span>{item.name}</span>
                              </div>

                              {item.badge !== undefined &&
                                item.badge !== null && (
                                  <span
                                    className={`
                                  text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wide transition-all shadow-sm
                                  ${item.badgeType === "danger" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : ""}
                                  ${item.badgeType === "warning" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : ""}
                                  ${item.badgeType === "neutral" ? "bg-slate-800 text-slate-400 border border-slate-700/50" : ""}
                                `}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
            )}

            {/* Quick Actions (Acțiuni Rapide) */}
            <div className="pt-4 border-t border-slate-900 space-y-2">
              <h3 className="px-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                Quick Actions
              </h3>
              <div className="space-y-1.5">
                {[
                  {
                    href: "/repairs?action=new",
                    text: "New Repair",
                    color:
                      "hover:border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border-transparent",
                    icon: PlusCircle,
                  },
                  {
                    href: "/breakdown?action=new",
                    text: "New Breakdown",
                    color:
                      "hover:border-rose-500/30 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border-transparent",
                    icon: ShieldAlert,
                  },
                ].map((action, idx) => (
                  <Link
                    key={idx}
                    href={action.href}
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-xl text-xs font-semibold transition-all duration-200 ${action.color}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <action.icon className="h-4 w-4" />
                      <span>{action.text}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 opacity-60" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: User Profile, Limba & Logout */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md space-y-4 shrink-0">
          <LanguageToggle />

          {userEmail && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-900/60">
              <div className="flex flex-col min-w-0 px-1">
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {userEmail.split("@")[0]}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {userEmail}
                </span>
              </div>
              <button
                onClick={customLogout}
                title={t?.logout || "Deconectare"}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
