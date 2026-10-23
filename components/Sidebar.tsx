"use client";

import { useState, useEffect, useMemo } from "react";
import { useSidebarAuth } from "@/lib/useSidebarAuth";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import LanguageToggle from "./LanguageToggle";
import {
  Factory,
  Wrench,
  Package,
  Users,
  Lightbulb,
  Cpu,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ClipboardCheck,
  History,
  Droplets,
  PlusCircle,
  ChevronLeft,
  Sun,
  Moon,
} from "lucide-react";

export default function Sidebar() {
  const { userEmail, isLoading, pathname, handleLogout } = useSidebarAuth();
  const { t } = useLanguage();

  // Stări pentru interfață
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // REPARAT: Pornim cu o stare neutră (false) pentru a preveni eroarea de Hydration SSR/Client
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [kpis, setKpis] = useState({
    machinesCount: 0,
    openRepairs: 0,
    openBreakdowns: 0,
    lowStockParts: 0,
  });

  // Închide meniul la schimbarea paginii
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // REPARAT: Citirea stărilor din LocalStorage se face DOAR după montarea componentei pe client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCollapsed = localStorage.getItem("sidebar-collapsed");
      if (savedCollapsed === "true") setIsCollapsed(true);

      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
        setIsDarkMode(true);
      }
    }
  }, []);

  // Aplicarea efectivă a temei nocturne
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem("sidebar-collapsed", String(nextState));
      return nextState;
    });
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };
  // Încărcarea securizată a KPI-urilor din Supabase (cu curățare la unmount/schimbare pagină)
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

  // Structura Meniului memoizată
  const navigationSections: any[] = useMemo(
    () => [
      {
        title: "Operations",
        items: [
          {
            name: "Equipments",
            href: "/tools",
            icon: Factory,
            badge: kpis.machinesCount,
            badgeType: "neutral",
          },
          {
            name: "Spare Parts",
            href: "/spare-parts",
            icon: Package,
            badge: kpis.lowStockParts > 0 ? kpis.lowStockParts : null,
            badgeType: "danger",
          },
          {
            name: "Factory Monitor",
            href: "/live-factory",
            icon: Factory,
          },
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
            name: "Weekly Planning",
            href: "/weekly-maintenance",
            icon: ClipboardCheck,
          },
          {
            name: "Technical Team",
            href: "/technicians",
            icon: Users,
          },
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
    [kpis],
  );

  return (
    <>
      {/* Buton Hamburger pe Mobil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-lg active:scale-95 transition-transform"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay Mobil */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-zinc-900/30 dark:bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Principal - Adaptiv Dual-Theme (Light / Dark) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-900
          flex flex-col justify-between h-full text-zinc-500 dark:text-zinc-400 shadow-sm shrink-0
          transition-all duration-300 ease-in-out lg:sticky lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        {/* Buton pentru Pliere (Collapse) pe Desktop */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex absolute -right-3 top-7 z-50 h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shadow-sm transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo Brand Header */}
          <div
            className={`p-5 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md ${isCollapsed ? "justify-center" : ""}`}
          >
            <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-2 rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="transition-opacity duration-200">
                <h1 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tracking-wide uppercase">
                  Metal Stamping
                </h1>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-widest uppercase">
                  Enterprise CMS
                </p>
              </div>
            )}
          </div>
          {/* Zona Scrollabilă de Navigație */}
          <div className="flex-1 overflow-y-auto px-3 py-6 space-y-7 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
            {isLoading ? (
              <div className="space-y-6 animate-pulse px-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-1/4 mb-3"></div>
                    <div className="h-9 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <nav className="space-y-7">
                {navigationSections.map((section: any) => (
                  <div key={section.title} className="space-y-1.5">
                    {!isCollapsed ? (
                      <h3 className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase transition-opacity duration-200">
                        {section.title}
                      </h3>
                    ) : (
                      <div className="border-t border-zinc-100 dark:border-zinc-900 my-2" />
                    )}
                    <ul className="space-y-1">
                      {section.items.map(
                        (item: {
                          name: string;
                          href: string;
                          icon: React.ComponentType<{ className?: string }>;
                          badge?: string | number | null;
                          badgeType?: "danger" | "warning" | "neutral";
                        }) => {
                          const isActive = pathname === item.href;
                          // Salvarea iconiței într-o componentă cu literă mare pentru validare JSX
                          const Icon = item.icon;

                          return (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                title={isCollapsed ? item.name : undefined}
                                className={`
                  group relative flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isCollapsed ? "justify-center" : "justify-between"}
                  ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-50 to-zinc-50 dark:from-emerald-950/30 dark:to-zinc-900/30 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-100/50 dark:border-emerald-900/30 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:bg-emerald-500 before:rounded-r-md"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-200 text-zinc-500 dark:text-zinc-400"
                  }
                `}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Utilizarea corectă a componentei ca element React */}
                                  <Icon
                                    className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 duration-200 ${
                                      isActive
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                                    }`}
                                  />
                                  {!isCollapsed && (
                                    <span className="truncate">
                                      {item.name}
                                    </span>
                                  )}
                                </div>

                                {!isCollapsed &&
                                  item.badge !== undefined &&
                                  item.badge !== null && (
                                    <span
                                      className={`
                        text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wide transition-all shrink-0
                        ${item.badgeType === "danger" ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30" : ""}
                        ${item.badgeType === "warning" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30" : ""}
                        ${item.badgeType === "neutral" ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800" : ""}
                      `}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                              </Link>
                            </li>
                          );
                        },
                      )}
                    </ul>
                  </div>
                ))}
              </nav>
            )}

            {/* Quick Actions (Acțiuni Rapide) */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 space-y-2">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase">
                  Quick Actions
                </h3>
              )}
              <div className="space-y-1.5">
                {[
                  {
                    href: "/repairs?action=new",
                    text: "New Repair",
                    color:
                      "hover:border-emerald-300 dark:hover:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-zinc-100 dark:border-zinc-900",
                    icon: PlusCircle,
                  },
                  {
                    href: "/breakdown?action=new",
                    text: "New Breakdown",
                    color:
                      "hover:border-rose-300 dark:hover:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-zinc-100 dark:border-zinc-900",
                    icon: ShieldAlert,
                  },
                ].map((action, idx) => (
                  <Link
                    key={idx}
                    href={action.href}
                    title={isCollapsed ? action.text : undefined}
                    className={`flex items-center border rounded-xl font-semibold transition-all duration-200 ${isCollapsed ? "p-2.5 justify-center" : "px-3 py-2 justify-between text-xs"} ${action.color}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <action.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && (
                        <span className="truncate">{action.text}</span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <ChevronRight className="h-3 w-3 opacity-60 shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Selector Temă, Limba & Logout */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-md space-y-4 shrink-0">
          {/* CONTROL DUAL DE TEMĂ (SOARE / LUNĂ) */}
          <div
            className={`flex items-center gap-2 ${isCollapsed ? "justify-center" : "px-2"}`}
          >
            <button
              onClick={toggleTheme}
              title={
                isDarkMode ? "Switch to Light Mode" : "Switch to Night Mode"
              }
              className="flex items-center justify-center p-2 w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95 shadow-sm"
            >
              {isDarkMode ? (
                <div className="flex items-center gap-2.5">
                  <Sun className="h-4 w-4 text-amber-500" />
                  {!isCollapsed && (
                    <span className="text-xs font-semibold">Light Mode</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  {!isCollapsed && (
                    <span className="text-xs font-semibold">Night Mode</span>
                  )}
                </div>
              )}
            </button>
          </div>

          <div className={`flex ${isCollapsed ? "justify-center" : "px-2"}`}>
            <LanguageToggle />
          </div>

          {userEmail && (
            <div
              className={`flex items-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 ${isCollapsed ? "p-2 justify-center" : "p-2 justify-between"}`}
            >
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 px-1 transition-opacity duration-200">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {userEmail.split("@")[0]}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                    {userEmail}
                  </span>
                </div>
              )}
              <button
                onClick={customLogout}
                title={t?.logout || "Deconectare"}
                className={`p-2 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${isCollapsed ? "w-full flex justify-center" : ""}`}
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
