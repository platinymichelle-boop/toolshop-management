"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export interface UserPermissions {
  role: string | null;
  can_view_repairs: boolean | null;
  can_view_tools: boolean | null;
  can_view_parts: boolean | null;
  can_view_reports: boolean | null;
}

export function useSidebarAuth() {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAccess() {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
          if (pathname !== "/login") router.push("/login");
          return;
        }

        const email = session.user.email;
        setUserEmail(email || null);

        const { data: userData, error } = await supabase
          .from("users")
          .select("role, can_view_repairs, can_view_tools, can_view_parts, can_view_reports")
          .eq("username", email)
          .maybeSingle();

        if (error) throw error;
        if (userData) setPermissions(userData);
      } catch (error: any) {
        console.error("Eroare permisiuni:", error.message);
      } finally {
        setIsLoading(false);
      }
    }
    checkAccess();
  }, [pathname, router]);

  async function handleLogout() {
    if (!window.confirm("Sigur dorești să te deconectezi?")) return;
    await supabase.auth.signOut();
    setPermissions(null);
    setUserEmail(null);
    router.push("/login");
  }

  return { permissions, userEmail, isLoading, pathname, handleLogout };
}
