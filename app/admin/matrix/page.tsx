"use client";

import { useAccessMatrix } from "@/hooks/useAccessMatrix";
// Importăm componenta butonului pe care am creat-o anterior
import PushRegister from "@/components/PushRegister";

export default function AccessMatrixPage() {
  const { users, isLoading, handlePermissionChange, handleChangeRole, deleteUser } = useAccessMatrix();

  return (
    <div className="space-y-8 pb-12">
      {/* Antet Secțiune Premium - Securitate Sistem & GPO */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Securitate Sistem & GPO
          </span>
          <h1 className="text-3xl font-black mt-2 tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Matrice Control Acces Global
          </h1>
          <p className="text-slate-400 mt-1 text-xs max-w-xl">
            Drepturile sunt setate implicit pe <span className="text-rose-400 font-bold uppercase">false</span>. Utilizați comutatoarele binare pentru a acorda sau revoca accesul tehnicienilor.
          </p>
        </div>
        
        {/* Zona din dreapta care grupează scutul administrativ și noul buton push mobil */}
        <div className="flex items-center space-x-4 relative z-10">
          <PushRegister />
          <span className="text-3xl p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl shadow-inner">🛡️</span>
        </div>
        
        <div className="absolute -right-10 -bottom-10 opacity-5 text-[14rem] font-black pointer-events-none select-none">🔐</div>
      </div>

      {/* Container Tabel Modernizat cu Umbre și Margini Rotunjite */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Angajat / Nume</th>
                <th className="py-4 px-6">Username / Email</th>
                <th className="py-4 px-6 text-center">Schimbă Rol</th>
                <th className="py-4 px-6 text-center">🔧 Reparații</th>
                <th className="py-4 px-6 text-center">🧰 Scule / Matrițe</th>
                <th className="py-4 px-6 text-center">📦 Piese Schimb</th>
                <th className="py-4 px-6 text-center">📊 Rapoarte (KPI)</th>
                <th className="py-4 px-6 text-center w-20">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic font-medium animate-pulse">
                    Se interogelează drepturile și se generează matricea binară...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((user) => {
                  const isUserAdmin = user.role === "admin";

                  return (
                    <tr key={user.id} className="hover:bg-indigo-50/20 transition-all group">
                      {/* Nume complet */}
                      <td className="py-4 px-6 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {user.full_name || "Nume Nesetat"}
                      </td>
                      
                      {/* Username Email */}
                      <td className="py-4 px-6 text-slate-500 font-mono text-xs">{user.username}</td>
                      
                      {/* Schimbare Rol */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleChangeRole(user.id, user.role)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all uppercase shadow-sm ${
                            isUserAdmin 
                              ? "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100" 
                              : "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                          }`}
                        >
                          {user.role || "user"}
                        </button>
                      </td>
                      
                      {/* Toggles GPO standardizate */}
                      <td className="py-4 px-6 text-center">
                        <label className="inline-flex items-center justify-center relative cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isUserAdmin ? true : (user.can_view_repairs || false)}
                            disabled={isUserAdmin}
                            onChange={() => handlePermissionChange(user.id, "can_view_repairs", user.can_view_repairs)}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-40" />
                        </label>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <label className="inline-flex items-center justify-center relative cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isUserAdmin ? true : (user.can_view_tools || false)}
                            disabled={isUserAdmin}
                            onChange={() => handlePermissionChange(user.id, "can_view_tools", user.can_view_tools)}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-40" />
                        </label>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <label className="inline-flex items-center justify-center relative cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isUserAdmin ? true : (user.can_view_parts || false)}
                            disabled={isUserAdmin}
                            onChange={() => handlePermissionChange(user.id, "can_view_parts", user.can_view_parts)}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-40" />
                        </label>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <label className="inline-flex items-center justify-center relative cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isUserAdmin ? true : (user.can_view_reports || false)}
                            disabled={isUserAdmin}
                            onChange={() => handlePermissionChange(user.id, "can_view_reports", user.can_view_reports)}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-40" />
                        </label>
                      </td>

                      {/* Buton Ștergere Utilizator */}
                      <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => deleteUser(user.id, user.full_name || "Utilizator")}
                        className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-all"
                        title="Șterge utilizator"
                      >
                        🗑️
                      </button>

                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    Nu s-au găsit utilizatori înregistrați.
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
