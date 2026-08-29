"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPermissions } from "@/lib/useSidebarAuth";
import { useLanguage } from "@/context/LanguageContext";
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
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  History,
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

  // Stări pentru controlul deschiderii fiecărei secțiuni (Acordeon)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    OPERATIONS: ["/dashboard", "/tools", "/repairs", "/breakdown"].includes(
      pathname,
    ),
    MAINTENANCE: [
      "/spare-parts",
      "/technicians",
      "/improvements",
      "/preventive-maintenance",
      "/pm-history",
    ].includes(pathname),
    ANALYTICS: ["/breakdown/dashboard", "/reports"].includes(pathname),
    ADMINISTRATION: ["/admin/matrix"].includes(pathname),
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const linkClass = (path: string) => {
    const isActive = pathname === path;
    return `
      group relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ml-2
      ${
        isActive
          ? "bg-indigo-600/10 text-white font-extrabold border-l-2 border-indigo-500 pl-2.5 rounded-l-none"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
      }
    `;
  };

  const iconClass = (path: string) => {
    const isActive = pathname === path;
    return `h-4 w-4 shrink-0 transition-transform group-hover:scale-110 duration-200 ${
      isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
    }`;
  };

  const sectionButtonClass = (isOpen: boolean) => `
    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-black tracking-wider uppercase transition-colors
    ${
      isOpen
        ? "bg-slate-900 text-slate-200 border border-slate-800/40"
        : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
    }
  `;

  return (
    <div className="space-y-3">
      {/* Secțiunea OPERATIONS */}
      <div className="space-y-1">
        <button
          onClick={() => toggleSection("OPERATIONS")}
          className={sectionButtonClass(openSections.OPERATIONS)}
        >
          <span>OPERATIONS</span>
          {openSections.OPERATIONS ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>

        {openSections.OPERATIONS && (
          <div className="space-y-0.5 pt-0.5 transition-all duration-200">
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              <LayoutDashboard className={iconClass("/dashboard")} />
              <span className="truncate">{t.dashboard}</span>
            </Link>

            {showTools && (
              <Link href="/tools" className={linkClass("/tools")}>
                <Factory className={iconClass("/tools")} />
                <span className="truncate">{t.tools}</span>
              </Link>
            )}

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

            <Link href="/live-factory" className={linkClass("/live-factory")}>
              <Factory className={iconClass("/live-factory")} />
              <span className="truncate">Factory Monitor</span>
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
          <span>MAINTENANCE</span>
          {openSections.MAINTENANCE ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>

        {openSections.MAINTENANCE && (
          <div className="space-y-0.5 pt-0.5 transition-all duration-200">
            <Link
              href="/preventive-maintenance"
              className={linkClass("/preventive-maintenance")}
            >
              {/* Notă: Poți adăuga o iconiță aici dacă dorești pentru consistență */}
              <span className="truncate">Preventive Maintenance</span>
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
            <span>ANALYTICS</span>
            {openSections.ANALYTICS ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>

          {openSections.ANALYTICS && (
            <div className="space-y-0.5 pt-0.5 transition-all duration-200">
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
            <span>ADMINISTRATION</span>
            {openSections.ADMINISTRATION ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>

          {openSections.ADMINISTRATION && (
            <div className="space-y-0.5 pt-0.5 transition-all duration-200">
              <Link href="/admin/matrix" className={linkClass("/admin/matrix")}>
                <Settings className={iconClass("/admin/matrix")} />
                <span className="truncate">Matrix Configuration</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
