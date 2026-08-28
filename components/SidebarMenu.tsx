"use client";

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

  const linkClass = (path: string) => {
    const isActive = pathname === path;
    return `
      group relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200
      ${
        isActive
          ? "bg-indigo-600/10 text-white font-extrabold border-l-2 border-indigo-500 pl-2.5 rounded-l-none"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
      }
    `;
  };

  const iconClass = (path: string) => {
    const isActive = pathname === path;
    return `h-4 w-4 shrink-0 transition-transform group-hover:scale-110 duration-200 ${
      isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
    }`;
  };

  return (
    <div className="space-y-5">
      {/* Secțiunea OPERATIONS */}
      <div className="space-y-1">
        <h3 className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
          OPERATIONS
        </h3>
        <div className="space-y-0.5">
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

          {/* Corectat conform structurii tale: /breakdown */}
          <Link href="/breakdown" className={linkClass("/breakdown")}>
            <AlertTriangle className={iconClass("/breakdown")} />
            <span className="truncate">Breakdown Tracker</span>
          </Link>
        </div>
      </div>

      {/* Secțiunea MAINTENANCE */}
      <div className="space-y-1">
        <h3 className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
          MAINTENANCE
        </h3>
        <div className="space-y-0.5">
          {showParts && (
            <Link href="/spare-parts" className={linkClass("/spare-parts")}>
              <Package className={iconClass("/spare-parts")} />
              <span className="truncate">{t.parts}</span>
            </Link>
          )}

          {/* Corectat conform structurii tale: /technicians */}
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
      </div>

      {/* Secțiunea ANALYTICS */}
      {showReports && (
        <div className="space-y-1">
          <h3 className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
            ANALYTICS
          </h3>
          <div className="space-y-0.5">
            {/* Corectat conform structurii tale: /breakdown/dashboard */}
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
        </div>
      )}

      {/* Secțiunea ADMINISTRATION */}
      {isAdmin && (
        <div className="space-y-1">
          <h3 className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
            ADMINISTRATION
          </h3>
          <div className="space-y-0.5">
            <Link href="/admin/matrix" className={linkClass("/admin/matrix")}>
              <Settings className={iconClass("/admin/matrix")} />
              <span className="truncate">{t.settings}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
