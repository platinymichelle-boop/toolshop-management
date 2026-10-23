"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserPermissions } from "@/lib/useSidebarAuth";
import { useLanguage } from "@/context/LanguageContext";
import {
  LayoutDashboard,
  Factory,
  Zap,
  Wrench,
  Package,
  Users,
  Lightbulb,
  AlertTriangle,
  BarChart3,
  FileBarChart2,
  Settings,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  History,
  Droplets,
  KeyRound,
  Wallet,
} from "lucide-react";

interface SidebarMenuProps {
  permissions: UserPermissions | null;
  pathname: string;
}

export default function SidebarMenu({
  permissions,
  pathname,
}: SidebarMenuProps) {
  const { t } = useLanguage();
  const isAdmin = permissions?.role === "admin";
  const showRepairs = isAdmin || permissions?.can_view_repairs === true;
  const showTools = isAdmin || permissions?.can_view_tools === true;
  const showParts = isAdmin || permissions?.can_view_parts === true;
  const showReports = isAdmin || permissions?.can_view_reports === true;

  // REPARAT: Pornim cu stările închise pe server pentru a asigura un proces de Hydration fără erori
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    OPERATIONS: false,
    MAINTENANCE: false,
    ANALYTICS: false,
    ADMINISTRATION: false,
  });

  // REPARAT: Deschidem automat secțiunea corespunzătoare doar după ce componenta s-a montat pe client
  useEffect(() => {
    setOpenSections({
      OPERATIONS: [
        "/dashboard",
        "/tools",
        "/energy",
        "/repairs",
        "/breakdown",
        "/customer-claims",
        "/live-factory",
        "/spare-parts",
      ].includes(pathname),
      MAINTENANCE: [
        "/technicians",
        "/improvements",
        "/preventive-maintenance",
        "/weekly-maintenance",
        "/pm-history",
        "/fluid-management",
        "/budget-planner",
        "/maintenance-reports",
      ].includes(pathname),
      ANALYTICS: ["/breakdown/dashboard", "/reports"].includes(pathname),
      ADMINISTRATION: [
        "/admin",
        "/access-management",
        "/admin/matrix",
      ].includes(pathname),
    });
  }, [pathname]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // REPARAT: Clase actualizate pentru suportul dual Light / Dark Mode (Emerald Theme)
  const linkClass = (path: string) => {
    const isActive = pathname === path;
    return `
      group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border
      ${
        isActive
          ? "bg-gradient-to-r from-emerald-50 to-zinc-50 dark:from-emerald-950/30 dark:to-zinc-900/30 border-emerald-100/50 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold shadow-sm before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:bg-emerald-500 before:rounded-r-md"
          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-transparent"
      }
    `;
  };

  const iconClass = (path: string) => {
    const isActive = pathname === path;
    return `h-4 w-4 shrink-0 transition-transform group-hover:scale-110 duration-200 ${
      isActive
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
    }`;
  };

  const sectionButtonClass = (isOpen: boolean) => `
    w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all duration-200 border
    ${
      isOpen
        ? "bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 border-zinc-200/50 dark:border-zinc-800/60"
        : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/20 border-transparent"
    }
  `;
  return (
    <div className="space-y-4">
      {/* Secțiunea OPERATIONS */}
      <div className="space-y-1">
        <button
          onClick={() => toggleSection("OPERATIONS")}
          className={sectionButtonClass(openSections.OPERATIONS)}
        >
          <span>Operations</span>
          {openSections.OPERATIONS ? (
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
          )}
        </button>

        {openSections.OPERATIONS && (
          <div className="space-y-1 pt-1 pl-2 transition-all duration-200">
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              <LayoutDashboard className={iconClass("/dashboard")} />
              <span className="truncate">{t.dashboard}</span>
            </Link>

            <Link href="/live-factory" className={linkClass("/live-factory")}>
              <Factory className={iconClass("/live-factory")} />
              <span className="truncate">Factory Monitor</span>
            </Link>

            <Link
              href="/customer-claims"
              className={linkClass("/customer-claims")}
            >
              <ClipboardCheck className={iconClass("/customer-claims")} />
              <span className="truncate">Customer Claims</span>
            </Link>

            {showTools && (
              <Link href="/tools" className={linkClass("/tools")}>
                <Factory className={iconClass("/tools")} />
                <span className="truncate">{t.tools}</span>
              </Link>
            )}

            <Link href="/energy" className={linkClass("/energy")}>
              <Zap className={iconClass("/energy")} />
              <span className="truncate">Energy Management</span>
            </Link>

            {showRepairs && (
              <Link href="/repairs" className={linkClass("/repairs")}>
                <Wrench className={iconClass("/repairs")} />
                <span className="truncate">{t.repairs}</span>
              </Link>
            )}

            <Link href="/breakdown" className={linkClass("/breakdown")}>
              <AlertTriangle className={iconClass("/breakdown")} />
              <span className="truncate">Breakdown Tracker</span>
            </Link>
          </div>
        )}
      </div>
      {/* Secțiunea MAINTENANCE */}
      <div className="space-y-1">
        <button
          onClick={() => toggleSection("MAINTENANCE")}
          className={sectionButtonClass(openSections.MAINTENANCE)}
        >
          <span>Maintenance</span>
          {openSections.MAINTENANCE ? (
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
          )}
        </button>
        {openSections.MAINTENANCE && (
          <div className="space-y-1 pt-1 pl-2 transition-all duration-200">
            {showParts && (
              <Link href="/spare-parts" className={linkClass("/spare-parts")}>
                <Package className={iconClass("/spare-parts")} />
                <span className="truncate">{t.parts || "Spare Parts"}</span>
              </Link>
            )}

            <Link
              href="/preventive-maintenance"
              className={linkClass("/preventive-maintenance")}
            >
              <Wrench className={iconClass("/preventive-maintenance")} />
              <span className="truncate">Preventive Maintenance</span>
            </Link>

            <Link
              href="/weekly-maintenance"
              className={linkClass("/weekly-maintenance")}
            >
              <ClipboardCheck className={iconClass("/weekly-maintenance")} />
              <span className="truncate">Weekly Maintenance</span>
            </Link>

            <Link href="/pm-history" className={linkClass("/pm-history")}>
              <History className={iconClass("/pm-history")} />
              <span className="truncate">PM History</span>
            </Link>

            {isAdmin && (
              <Link href="/technicians" className={linkClass("/technicians")}>
                <Users className={iconClass("/technicians")} />
                <span className="truncate">{t.technicians}</span>
              </Link>
            )}

            <Link href="/improvements" className={linkClass("/improvements")}>
              <Lightbulb className={iconClass("/improvements")} />
              <span className="truncate">{t.improvements}</span>
            </Link>

            <Link
              href="/fluid-management"
              className={linkClass("/fluid-management")}
            >
              <Droplets className={iconClass("/fluid-management")} />
              <span className="truncate">Fluid Management</span>
            </Link>

            <Link
              href="/budget-planner"
              className={linkClass("/budget-planner")}
            >
              <Wallet className={iconClass("/budget-planner")} />
              <span className="truncate">Budget Planner</span>
            </Link>

            <Link
              href="/maintenance-reports"
              className={linkClass("/maintenance-reports")}
            >
              <ClipboardCheck className={iconClass("/maintenance-reports")} />
              <span className="truncate">Maintenance Reports</span>
            </Link>
          </div>
        )}
      </div>

      {/* Secțiunea ANALYTICS */}
      {showReports && (
        <div className="space-y-1">
          <button
            onClick={() => toggleSection("ANALYTICS")}
            className={sectionButtonClass(openSections.ANALYTICS)}
          >
            <span>Analytics</span>
            {openSections.ANALYTICS ? (
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 opacity-70" />
            )}
          </button>

          {openSections.ANALYTICS && (
            <div className="space-y-1 pt-1 pl-2 transition-all duration-200">
              <Link
                href="/breakdown/dashboard"
                className={linkClass("/breakdown/dashboard")}
              >
                <BarChart3 className={iconClass("/breakdown/dashboard")} />
                <span className="truncate">Breakdown Analytics</span>
              </Link>

              <Link href="/reports" className={linkClass("/reports")}>
                <FileBarChart2 className={iconClass("/reports")} />
                <span className="truncate">{t.reports}</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Secțiunea ADMINISTRATION */}
      {isAdmin && (
        <div className="space-y-1">
          <button
            onClick={() => toggleSection("ADMINISTRATION")}
            className={sectionButtonClass(openSections.ADMINISTRATION)}
          >
            <span>Administration</span>
            {openSections.ADMINISTRATION ? (
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 opacity-70" />
            )}
          </button>

          {openSections.ADMINISTRATION && (
            <div className="space-y-1 pt-1 pl-2 transition-all duration-200">
              <Link href="/admin/matrix" className={linkClass("/admin/matrix")}>
                <Settings className={iconClass("/admin/matrix")} />
                <span className="truncate">Matrix Configuration</span>
              </Link>

              <Link
                href="/access-management"
                className={linkClass("/access-management")}
              >
                <KeyRound className={iconClass("/access-management")} />
                <span className="truncate">Access Management</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
