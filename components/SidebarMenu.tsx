"use client";

import Link from "next/link";
import { UserPermissions } from "@/lib/useSidebarAuth";

interface SidebarMenuProps {
  permissions: UserPermissions | null;
  pathname: string;
}

export default function SidebarMenu({ permissions, pathname }: SidebarMenuProps) {
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
          <span>🏠</span> Dashboard
        </Link>
      </li>

      {showRepairs && (
        <li>
          <Link href="/repairs" className={linkClass("/repairs")}>
            <span>🔧</span> Repairs
          </Link>
        </li>
      )}

      {showTools && (
        <li>
          <Link href="/tools" className={linkClass("/tools")}>
            <span>🧰</span> Tools / Matrițe
          </Link>
        </li>
      )}

      {showParts && (
        <li>
          <Link href="/spare-parts" className={linkClass("/spare-parts")}>
            <span>📦</span> Spare Parts
          </Link>
        </li>
      )}

      {isAdmin && (
        <li>
          <Link href="/technicians" className={linkClass("/technicians")}>
            <span>🧑‍🔧</span> Technicians Team
          </Link>
        </li>
      )}

      <li>
        <Link href="/improvements" className={linkClass("/improvements")}>
          <span>💡</span> Improvements
        </Link>
      </li>

      {showReports && (
        <li>
          <Link href="/reports" className={linkClass("/reports")}>
            <span>📊</span> Reports
          </Link>
        </li>
      )}

      {isAdmin && (
        <li className="pt-4 border-t border-slate-800/60 mt-4">
          <Link href="/admin/matrix" className={linkClass("/admin/matrix")}>
            <span>⚙️</span> GPO / Settings
          </Link>
        </li>
      )}
    </ul>
  );
}
