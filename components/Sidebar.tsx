"use client";

import { useState, useEffect, useMemo } from "react";
import { useSidebarAuth } from "@/lib/useSidebarAuth";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import SidebarMenu from "./SidebarMenu";
import {
  Factory,
  Wrench,
  Users,
  Cpu,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ClipboardCheck,
  Droplets,
  PlusCircle,
  ChevronLeft,
} from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | null;
  badgeType?: "danger" | "warning" | "neutral";
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

interface QuickActionItem {
  href: string;
  text: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Sidebar() {
  const { userEmail, isLoading, pathname, handleLogout } = useSidebarAuth();
  const { t } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [kpis, setKpis] = useState({
    machinesCount: 0,
    openRepairs: 0,
    openBreakdowns: 0,
    lowStockParts: 0,
  });

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCollapsed = localStorage.getItem("sidebar-collapsed");
      if (savedCollapsed === "true") setIsCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem("sidebar-collapsed", String(nextState));
      return nextState;
    });
  };

  useEffect(() => {
    let isMounted = true;

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

        if (isMounted) {
          setKpis({
            machinesCount: toolsRes.count || 0,
            openRepairs: repairsRes.count || 0,
            openBreakdowns: breakdownsRes.count || 0,
            lowStockParts: partsRes.count || 0,
          });
        }
      } catch (err) {
        console.error("Eroare la încărcarea KPI-urilor din sidebar:", err);
      }
    }

    fetchSidebarKPIs();

    return () => {
      isMounted = false;
    };
  }, [pathname]);
  const customLogout = async () => {
    if (!window.confirm(t?.logoutConfirm || "Sigur doriți să vă deconectați?"))
      return;
    await handleLogout();
  };

  const navigationSections: NavigationSection[] = useMemo(
    () => [
      {
        title: "Operations",
        items: [
          { name: "Factory Monitor", href: "/live-factory", icon: Factory },
        ],
      },
      {
        title: "Maintenance",
        items: [
          {
            name: "Preventive Maintenance",
            href: "/preventive-maintenance",
            icon: Wrench,
          },
          {
            name: "Weekly Maintenance",
            href: "/weekly-maintenance",
            icon: ClipboardCheck,
          },
          { name: "Technical Team", href: "/technicians", icon: Users },
          {
            name: "Fluid Management",
            href: "/fluid-management",
            icon: Droplets,
          },
          {
            name: "Maintenance Reports",
            href: "/maintenance-reports",
            icon: ClipboardCheck,
          },
        ],
      },
    ],
    [],
  );

  const quickActions: QuickActionItem[] = useMemo(
    () => [
      {
        href: "/repairs?action=new",
        text: "New Repair",
        color:
          "border-zinc-300 text-emerald-700 bg-emerald-100/50 hover:bg-emerald-100",
        icon: PlusCircle,
      },
      {
        href: "/breakdown?action=new",
        text: "New Breakdown",
        color: "border-zinc-300 text-rose-700 bg-rose-100/50 hover:bg-rose-100",
        icon: ShieldAlert,
      },
    ],
    [],
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-zinc-200 border border-zinc-300 text-zinc-800 shadow-md active:scale-95 transition-all"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-zinc-900/20 z-40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        style={{ backgroundColor: "#e4e4e7" }}
        className={`fixed inset-y-0 left-0 z-40 border-r border-zinc-300 flex flex-col justify-between h-full text-zinc-600 shadow-sm shrink-0 transition-all duration-300 ease-in-out lg:sticky lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex absolute -right-3 top-6 z-50 h-6 w-6 items-center justify-center rounded-full bg-white border border-zinc-300 text-zinc-500 hover:text-zinc-800 shadow-sm transition-colors group"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft className="h-3 w-3 group-hover:scale-110 transition-transform" />
          )}
        </button>

        <div className="flex flex-col min-h-0 flex-1">
          <div
            className={`p-5 border-b border-zinc-300 flex items-center gap-3 bg-zinc-200/20 backdrop-blur-md ${isCollapsed ? "justify-center" : ""}`}
          >
            <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-2.5 rounded-xl shadow-md flex items-center justify-center shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="transition-opacity duration-200">
                <h1 className="text-xs font-bold text-zinc-800 tracking-wider uppercase">
                  Metal Stamping
                </h1>
                <p className="text-[10px] text-emerald-700 font-bold tracking-widest uppercase mt-0.5">
                  Enterprise CMS
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7 scrollbar-thin scrollbar-thumb-zinc-300">
            {isLoading ? (
              <div className="space-y-6 animate-pulse px-1">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-2.5 bg-zinc-300 rounded w-1/3 mb-2"></div>
                    <div className="h-9 bg-zinc-300 rounded-xl w-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <SidebarMenu permissions={null} pathname={pathname} />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-300 bg-zinc-200/40 backdrop-blur-md space-y-3 shrink-0">
          {userEmail && (
            <div
              className={`flex items-center rounded-xl bg-white border border-zinc-300 shadow-sm ${isCollapsed ? "p-2 justify-center" : "p-3 justify-between"}`}
            >
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 transition-opacity duration-200">
                  <span className="text-xs font-bold text-zinc-700 truncate">
                    {userEmail.split("@")}
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {userEmail}
                  </span>
                </div>
              )}
              <button
                onClick={customLogout}
                title={t?.logout || "Deconectare"}
                className={`p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ${isCollapsed ? "w-full flex justify-center" : ""}`}
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
