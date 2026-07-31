"use client";

import Link from "next/link";
import { UserPermissions } from "@/lib/useSidebarAuth";
import { useLanguage } from "@/context/LanguageContext";

interface SidebarMenuProps {
  permissions: UserPermissions | null;
  pathname: string;
}

export default function SidebarMenu({ permissions, pathname }: SidebarMenuProps) {
  const { t } = useLanguage();
  const isAdmin = permissions?.role === "admin";
  const showRepairs = isAdmin || permissions?.can_view_repairs === true;
  const showTools = isAdmin || permissions?.can_view_tools === true;
  const showParts = isAdmin || permissions?.can_view_parts === true;
  const showReports = isAdmin || permissions?.can_view_reports === true;

  const linkClass = (path: string) => `
    flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold transition-colors
    ${pathname === path 
      ? "bg-indigo-600 text-white font-bold shadow-md" 
      : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"}
  `;

  return (
    <ul className="space-y-1">
      <li>
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          {t.dashboard}
        </Link>
      </li>

      {showRepairs && (
        <li>
          <Link href="/repairs" className={linkClass("/repairs")}>
            {t.repairs}
          </Link>
        </li>
      )}

      {showTools && (
        <li>
          <Link href="/tools" className={linkClass("/tools")}>
            {t.tools}
          </Link>
        </li>
      )}

      {showParts && (
        <li>
          <Link href="/spare-parts" className={linkClass("/spare-parts")}>
            {t.parts}
          </Link>
        </li>
      )}

      {isAdmin && (
        <li>
          <Link href="/technicians" className={linkClass("/technicians")}>
            {t.technicians}
          </Link>
        </li>
      )}

      <li>
        <Link href="/improvements" className={linkClass("/improvements")}>
          {t.improvements}
        </Link>
      </li>

      {/* ⚠️ ADĂUGAT: Înregistrare Avarie (Vizibil pentru toți operatorii/tehnicienii) */}
      <li>
        <Link href="/breakdown" className={linkClass("/breakdown")}>
          ⚠️ Breakdown Tracker
        </Link>
      </li>

      {/* 📊 ADĂUGAT: Analytics & MTTR (Vizibil doar pentru management / admin) */}
      {showReports && (
        <li>
          <Link href="/breakdown/dashboard" className={linkClass("/breakdown/dashboard")}>
            📊 Breakdown Analytics
          </Link>
        </li>
      )}

      {showReports && (
        <li>
          <Link href="/reports" className={linkClass("/reports")}>
            {t.reports}
          </Link>
        </li>
      )}

      {isAdmin && (
        <li className="pt-4 border-t border-slate-800/60 mt-4">
          <Link href="/admin/matrix" className={linkClass("/admin/matrix")}>
            {t.settings}
          </Link>
        </li>
      )}
    </ul>
  );
}
