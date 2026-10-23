"use client";

import Link from "next/link";
import { UserPermissions } from "@/lib/useSidebarAuth";
import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect } from "react";
import {
  Factory,
  Wrench,
  Users,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  History,
  Droplets,
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

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    OPERATIONS: false,
    MAINTENANCE: false,
  });

  useEffect(() => {
    setOpenSections({
      OPERATIONS: ["/live-factory"].includes(pathname),
      MAINTENANCE: [
        "/technicians",
        "/preventive-maintenance",
        "/weekly-maintenance",
        "/pm-history",
        "/fluid-management",
        "/maintenance-reports",
      ].includes(pathname),
    });
  }, [pathname]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const linkClass = (path: string) => {
    const isActive = pathname === path;
    return `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border ${
      isActive
        ? "bg-zinc-200/60 border-zinc-300/80 text-emerald-700 font-bold shadow-sm before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:bg-emerald-600 before:rounded-r-md"
        : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/40 border-transparent bg-transparent"
    }`;
  };

  const iconClass = (path: string) => {
    const isActive = pathname === path;
    return `h-4 w-4 shrink-0 transition-transform group-hover:scale-105 duration-200 ${
      isActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-600"
    }`;
  };

  const sectionButtonClass = (isOpen: boolean) => `
    w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all duration-200 border ${
      isOpen
        ? "bg-zinc-200/30 text-zinc-600 border-zinc-200/60"
        : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/30 border-transparent"
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
          <span>Maintenance</span>
          {openSections.MAINTENANCE ? (
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
          )}
        </button>
        {openSections.MAINTENANCE && (
          <div className="space-y-1 pt-1 pl-2 transition-all duration-200">
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

            <Link
              href="/fluid-management"
              className={linkClass("/fluid-management")}
            >
              <Droplets className={iconClass("/fluid-management")} />
              <span className="truncate">Fluid Management</span>
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
    </div>
  );
}
