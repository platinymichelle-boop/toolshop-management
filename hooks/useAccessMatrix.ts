    "use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AppUser {
  id: number;
  created_at: string;
  username: string | null;
  full_name: string | null;
  role: string | null;
  active: boolean | null;
  can_view_repairs: boolean | null;
  can_view_tools: boolean | null;
  can_view_parts: boolean | null;
  can_view_reports: boolean | null;
}

export function useAccessMatrix() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadUsersAndPermissions() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      if (data) setUsers(data);
    } catch (error: any) {
      console.error("Eroare la încărcarea matricei de acces:", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadUsersAndPermissions(); }, []);

  async function handlePermissionChange(userId: number, column: keyof AppUser, currentValue: any) {
    const newValue = !currentValue;
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, [column]: newValue } : user))
    );

    const { error } = await supabase.from("users").update({ [column]: newValue }).eq("id", userId);
    if (error) {
      alert("Eroare la salvare: " + error.message);
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, [column]: currentValue } : user))
      );
    }
  }

  async function handleChangeRole(userId: number, currentRole: string | null) {
    const nextRole = currentRole === "admin" ? "technician" : "admin";
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole } : u));

    const { error } = await supabase.from("users").update({ role: nextRole }).eq("id", userId);
    if (error) {
      alert("Eroare la schimbarea rolului: " + error.message);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: currentRole } : u));
    }
  }

  async function deleteUser(userId: number, fullName: string) {
    if (!window.confirm(`⚠️ SIGURANȚĂ GPO: Ștergi definitiv utilizatorul ${fullName || "Nesetat"}? Acest tehnician va pierde instant accesul în sistem.`)) return;
    try {
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw error;
      loadUsersAndPermissions();
    } catch (error: any) {
      alert("Eroare la ștergerea utilizatorului: " + error.message);
    }
  }

  return { users, isLoading, handlePermissionChange, handleChangeRole, deleteUser };
}
