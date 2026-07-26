"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface AppUser {
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

export default function AccessMatrixPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Încărcarea listei complete de utilizatori din tabela publică `users`
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

  useEffect(() => {
    loadUsersAndPermissions();
  }, []);

  // Salvarea modificării unei bife instant în Supabase când Adminul dă click
  async function handlePermissionChange(userId: number, column: keyof AppUser, currentValue: any) {
    // Inversăm valoarea curentă (dacă era null/false devine true, dacă era true devine false)
    const newValue = !currentValue;

    // 1. Actualizăm starea locală din React instantaneu pentru fluiditate vizuală
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, [column]: newValue } : user))
    );

    // 2. Salvăm modificarea direct în rândul utilizatorului din Supabase
    const { error } = await supabase
      .from("users")
      .update({ [column]: newValue })
      .eq("id", userId);

    if (error) {
      alert("Nu s-a putut salva permisiunea în baza de date: " + error.message);
      // Dacă a eșuat salvarea din rețea, resetăm bifa la valoarea ei anterioară
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, [column]: currentValue } : user))
      );
    }
  }

  // Funcție rapidă pentru a schimba rolul global (Admin vs Tech) direct din matrice
  async function handleChangeRole(userId: number, currentRole: string | null) {
    const nextRole = currentRole === "admin" ? "technician" : "admin";
    
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole } : u));

    const { error } = await supabase
      .from("users")
      .update({ role: nextRole })
      .eq("id", userId);

    if (error) {
      alert("Eroare la schimbarea rolului: " + error.message);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: currentRole } : u));
    }
  }

  return (
    <div className="space-y-8">
      {/* Antet Secțiune IT / Admin */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-lg flex justify-between items-center">
        <div>
          <span className="bg-rose-500/20 text-rose-300 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            Securitate Sistem & GPO
          </span>
          <h1 className="text-2xl font-black mt-2 tracking-tight">Matrice Control Acces Global</h1>
          <p className="text-slate-400 mt-1 text-xs max-w-xl">
            Drepturile de acces sunt setate implicit pe <span className="text-rose-400 font-bold">FALSE</span>. Bifează modulele pentru a acorda permisiuni de vizualizare tehnicienilor.
          </p>
        </div>
        <span className="text-3xl p-3 bg-slate-800 rounded-xl">🛡️</span>
      </div>

      {/* Tabelul Matricei de Drepturi */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Angajat / Nume</th>
                <th className="py-4 px-6">Username / Email</th>
                <th className="py-4 px-6 text-center">Schimbă Rol</th>
                <th className="py-4 px-6 text-center">🔧 Reparații</th>
                <th className="py-4 px-6 text-center">🧰 Scule / Matrițe</th>
                <th className="py-4 px-6 text-center">📦 Piese Schimb</th>
                <th className="py-4 px-6 text-center">📊 Rapoarte (KPI)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                    Se intergolează drepturile și se generează matricea...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">{user.full_name || "Nume Nesetat"}</td>
                    <td className="py-4 px-6 text-gray-500 font-mono text-xs">{user.username}</td>
                    
                    {/* Buton comutare Rol Global */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleChangeRole(user.id, user.role)}
                        className={`px-3 py-1 rounded-lg text-xs font-black tracking-wide transition-all uppercase cursor-pointer ${
                          user.role === "admin" 
                            ? "bg-red-50 text-red-700 border border-red-200" 
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {user.role || "user"}
                      </button>
                    </td>
                    
                    {/* Checkbox-uri corelate binar cu coloanele tale din Supabase */}
                    {/* Notă: Dacă utilizatorul este admin, checkboxes sunt bifate din oficiu și dezactivate */}
                    <td className="py-4 px-6 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                        checked={user.role === "admin" ? true : (user.can_view_repairs || false)}
                        disabled={user.role === "admin"}
                        onChange={() => handlePermissionChange(user.id, "can_view_repairs", user.can_view_repairs)}
                      />
                    </td>
                    
                    <td className="py-4 px-6 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                        checked={user.role === "admin" ? true : (user.can_view_tools || false)}
                        disabled={user.role === "admin"}
                        onChange={() => handlePermissionChange(user.id, "can_view_tools", user.can_view_tools)}
                      />
                    </td>
                    
                    <td className="py-4 px-6 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                        checked={user.role === "admin" ? true : (user.can_view_parts || false)}
                        disabled={user.role === "admin"}
                        onChange={() => handlePermissionChange(user.id, "can_view_parts", user.can_view_parts)}
                      />
                    </td>
                    
                    <td className="py-4 px-6 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                        checked={user.role === "admin" ? true : (user.can_view_reports || false)}
                        disabled={user.role === "admin"}
                        onChange={() => handlePermissionChange(user.id, "can_view_reports", user.can_view_reports)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Nu s-au găsit conturi înregistrate în tabela users.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
