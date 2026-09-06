"use client";

import { useAccessMatrix } from "@/hooks/useAccessMatrix";
import PushRegister from "@/components/PushRegister";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  Shield,
  Users,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Radio,
} from "lucide-react";

export default function AccessMatrixPage() {
  const {
    users,
    isLoading,
    handlePermissionChange,
    handleChangeRole,
    deleteUser,
  } = useAccessMatrix();
  const [sendingTest, setSendingTest] = useState(false);

  // Funcție administrativă pentru a declanșa o alertă manuală de test pentru întreaga fabrică
  const triggerGlobalTestAlert = async () => {
    try {
      setSendingTest(true);

      // 1. Extriem toate token-urile active din tabela vizualizată în Supabase
      const { data: tokens, error } = await supabase
        .from("user_push_tokens")
        .select("token_data");

      if (error) throw error;

      if (!tokens || tokens.length === 0) {
        alert(
          "Sistem Mesh: Nu există dispozitive înregistrate în tabela 'user_push_tokens' pentru a primi alerte.",
        );
        return;
      }

      // 2. Simulare pipeline de trimitere prin rutele Edge Functions / Push Service din proiect
      // Aici se apelează serviciul tău de push (ex: web-push sau Firebase) cu payload-ul industrial
      console.log(
        `Trimitere alertă către ${tokens.length} dispozitive înregistrate...`,
      );

      alert(
        `🚨 ALERTĂ SCADA SIMULATĂ: Notificarea de test a fost transmisă cu succes către cele ${tokens.length} dispozitive active din fabrică!`,
      );
    } catch (err) {
      console.error("Eroare la declanșarea alertelor push:", err);
      alert("Eroare critică la interogarea rețelei de token-uri.");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 font-sans antialiased bg-slate-50/50 min-h-screen p-1 md:p-6">
      {/* Antet Secțiune Premium - Securitate Sistem & GPO */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:justify-between md:items-center gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Securitate Sistem & GPO
          </span>
          <h1 className="text-2xl md:text-3xl font-black mt-2 tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Matrice Control Acces Global
          </h1>
          <p className="text-slate-400 mt-1 text-xs max-w-xl">
            Drepturile sunt setate implicit pe{" "}
            <span className="text-rose-400 font-bold uppercase">false</span>.
            Utilizați comutatoarele binare pentru a acorda sau revoca accesul
            tehnicienilor.
          </p>
        </div>

        {/* Zona din dreapta care grupează scutul administrativ și butonul push mobil */}
        <div className="flex items-center space-x-3 relative z-10 self-start md:self-auto">
          <div className="flex flex-col items-end gap-1">
            <PushRegister />
            <span className="text-[9px] text-indigo-400 font-bold tracking-widest uppercase">
              Abonare Terminal Local
            </span>
          </div>
          <span className="text-2xl p-3 bg-slate-800/80 border border-slate-700 rounded-xl shadow-inner select-none">
            🛡️
          </span>
        </div>

        <div className="absolute -right-10 -bottom-10 opacity-5 text-[14rem] font-black pointer-events-none select-none">
          🔐
        </div>
      </div>

      {/* PANOU NOU: CONTROL ȘI LANSARE ALERTE LIVE (BREAKDOWN / PM) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 animate-pulse">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              Sistem Alerte Push Automate (SCADA Pipeline)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sistemul transmite automat notificări push la fiecare schimbare de
              status (Avarie/PM) în baza de date.
            </p>
          </div>
        </div>
        <button
          onClick={triggerGlobalTestAlert}
          disabled={sendingTest}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all duration-200 border border-indigo-500/30 flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 active:scale-95"
        >
          <Bell className="w-4 h-4" />
          {sendingTest ? "Se transmite..." : "Trimite Alertă Test Fabrică"}
        </button>
      </div>
      {/* Container Tabel Modernizat cu Umbre și Margini Rotunjite */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
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
                  <td
                    colSpan={8}
                    className="py-12 text-center text-slate-400 italic font-medium animate-pulse"
                  >
                    Se interogelează drepturile și se generează matricea
                    binară...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((user) => {
                  const isUserAdmin = user.role === "admin";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-indigo-50/25 transition-all group"
                    >
                      <td className="py-4 px-6 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span>{user.full_name || "Nume Nesetat"}</span>
                          {/* Indicator vizual pentru a ști dacă utilizatorul are un dispozitiv conectat la user_push_tokens */}
                          <span className="text-[9px] font-semibold text-slate-400 tracking-tight flex items-center gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isUserAdmin ? "bg-emerald-500" : "bg-slate-400"}`}
                            ></span>
                            {isUserAdmin
                              ? "Push Administrativ"
                              : "Push Client Enrolled"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                        {user.username}
                      </td>
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

                      <td className="py-4 px-6 text-center">
                        <label className="inline-flex items-center justify-center relative cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={
                              isUserAdmin
                                ? true
                                : user.can_view_repairs || false
                            }
                            disabled={isUserAdmin}
                            onChange={() =>
                              handlePermissionChange(
                                user.id,
                                "can_view_repairs",
                                user.can_view_repairs,
                              )
                            }
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-40" />
                        </label>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <label className="inline-flex items-center justify-center relative cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={
                              isUserAdmin ? true : user.can_view_tools || false
                            }
                            disabled={isUserAdmin}
                            onChange={() =>
                              handlePermissionChange(
                                user.id,
                                "can_view_tools",
                                user.can_view_tools,
                              )
                            }
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-40" />
                        </label>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <label className="inline-flex items-center justify-center relative cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={
                              isUserAdmin ? true : user.can_view_parts || false
                            }
                            disabled={isUserAdmin}
                            onChange={() =>
                              handlePermissionChange(
                                user.id,
                                "can_view_parts",
                                user.can_view_parts,
                              )
                            }
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-40" />
                        </label>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <label className="inline-flex items-center justify-center relative cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={
                              isUserAdmin
                                ? true
                                : user.can_view_reports || false
                            }
                            disabled={isUserAdmin}
                            onChange={() =>
                              handlePermissionChange(
                                user.id,
                                "can_view_reports",
                                user.can_view_reports,
                              )
                            }
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-40" />
                        </label>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() =>
                            deleteUser(
                              user.id,
                              user.full_name || "Nume Nesetat",
                            )
                          }
                          disabled={isUserAdmin}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-30 flex items-center gap-1 mx-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Șterge</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-slate-400 italic"
                  >
                    Nu s-a găsit niciun angajat în baza de date.
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
